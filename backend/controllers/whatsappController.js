const crypto = require("crypto");

const Appointment = require("../models/Appointment");
const ChatSession = require("../models/ChatSession");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const asyncHandler = require("../utils/asyncHandler");
const { getDayName, normalizeDate } = require("../utils/dateUtils");
const { formatIndianPhoneNumber, sendWhatsAppMessage } = require("../services/whatsappService");

const sendSafely = async (phone, message) => {
  try {
    await sendWhatsAppMessage(phone, message);
  } catch (error) {
    console.error(`WhatsApp webhook send failed: ${error.message}`);
  }
};

const extractIncomingMessage = (body) => {
  const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (!message || message.type !== "text") {
    return null;
  }

  return {
    phone: formatIndianPhoneNumber(message.from),
    text: (message.text?.body || "").trim()
  };
};

const extractWebhookStatus = (body) => body?.entry?.[0]?.changes?.[0]?.value?.statuses?.[0] || null;

const isValidMetaSignature = (req) => {
  const appSecret = process.env.META_APP_SECRET;

  if (!appSecret) {
    return true;
  }

  const signature = req.get("x-hub-signature-256");

  if (!signature || !req.rawBody) {
    return false;
  }

  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", appSecret)
    .update(req.rawBody)
    .digest("hex")}`;

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  return signatureBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
};

const getPhoneCandidates = (phone) => {
  const formattedPhone = formatIndianPhoneNumber(phone);
  const localPhone = formattedPhone?.startsWith("91") ? formattedPhone.slice(2) : formattedPhone;

  return [...new Set([formattedPhone, `+${formattedPhone}`, localPhone, `0${localPhone}`].filter(Boolean))];
};

const findPendingConfirmation = async (phone) => {
  const patients = await Patient.find({ phone: { $in: getPhoneCandidates(phone) } }).select("_id");
  const patientIds = patients.map((patient) => patient._id);

  if (!patientIds.length) {
    return null;
  }

  return Appointment.findOne({
    patientId: { $in: patientIds },
    status: "pending_confirmation",
    confirmationStatus: "pending"
  })
    .sort({ confirmationRequestedAt: -1, createdAt: -1 })
    .populate("patientId", "name phone")
    .populate("doctorId", "name phone");
};

const handleConfirmationReply = async (appointment, reply) => {
  const patient = appointment.patientId;
  const doctor = appointment.doctorId;
  const day = getDayName(appointment.date);

  if (reply === "YES") {
    appointment.status = "confirmed";
    appointment.confirmationStatus = "confirmed";
    appointment.confirmedAt = new Date();
    appointment.patientReply = "YES";
    appointment.clinicNotified = true;
    await appointment.save();

    await Promise.all([
      sendSafely(
        patient.phone,
        `Thank you. Your appointment is confirmed with Dr. ${doctor.name} on ${appointment.date}, ${day} at ${appointment.time}.`
      ),
      sendSafely(
        doctor.phone,
        `Follow-up appointment confirmed. Patient: ${patient.name}. Date: ${appointment.date}, ${day}. Time: ${appointment.time}. Reason: ${appointment.followUpType}.`
      ),
      sendSafely(
        process.env.CLINIC_WHATSAPP_NUMBER,
        `Patient ${patient.name} has confirmed the follow-up appointment with Dr. ${doctor.name} on ${appointment.date}, ${day} at ${appointment.time}.`
      )
    ]);

    return true;
  }

  if (reply === "NO") {
    appointment.status = "declined";
    appointment.confirmationStatus = "declined";
    appointment.declinedAt = new Date();
    appointment.patientReply = "NO";
    appointment.clinicNotified = true;
    await appointment.save();

    await Promise.all([
      sendSafely(
        patient.phone,
        "Your follow-up appointment has been declined. Please call the clinic to reschedule your appointment."
      ),
      sendSafely(
        doctor.phone,
        `Follow-up appointment declined. Patient: ${patient.name} declined the appointment on ${appointment.date}, ${day} at ${appointment.time}. Please check your clinic dashboard.`
      ),
      sendSafely(
        process.env.CLINIC_WHATSAPP_NUMBER,
        `Patient ${patient.name} declined the follow-up appointment with Dr. ${doctor.name}. Please call the patient to reschedule.`
      )
    ]);

    return true;
  }

  await sendSafely(patient.phone, "Please reply YES to confirm your appointment or NO to decline.");
  return true;
};

const getOrCreateSession = async (phone) =>
  ChatSession.findOneAndUpdate(
    { phone },
    { $setOnInsert: { phone, step: "initial", tempData: {} }, updatedAt: new Date() },
    { upsert: true, new: true }
  );

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const resetSession = async (session) => {
  session.step = "initial";
  session.tempData = {};
  session.updatedAt = new Date();
  await session.save();
};

const handleBookingBot = async (phone, text) => {
  const session = await getOrCreateSession(phone);
  const message = text.trim();

  if (session.step === "initial") {
    if (message === "1") {
      session.step = "booking_name";
      session.updatedAt = new Date();
      await session.save();
      await sendSafely(phone, "Please share the patient name.");
      return;
    }

    if (message === "2") {
      session.step = "check_appointment";
      session.updatedAt = new Date();
      await session.save();
      await sendSafely(phone, "Please share your phone number or name.");
      return;
    }

    await sendSafely(phone, "Welcome to clinic booking.\n1. Book Appointment\n2. Check Appointment");
    return;
  }

  if (session.step === "booking_name") {
    session.tempData = { ...session.tempData, name: message };
    session.step = "booking_date";
    session.updatedAt = new Date();
    await session.save();
    await sendSafely(phone, "Please share the appointment date in YYYY-MM-DD format.");
    return;
  }

  if (session.step === "booking_date") {
    const date = normalizeDate(message);

    if (!date) {
      await sendSafely(phone, "Please send a valid date in YYYY-MM-DD format.");
      return;
    }

    session.tempData = { ...session.tempData, date };
    session.step = "booking_time";
    session.updatedAt = new Date();
    await session.save();
    await sendSafely(phone, "Please share the appointment time, for example 11:30.");
    return;
  }

  if (session.step === "booking_time") {
    session.tempData = { ...session.tempData, time: message };
    session.step = "booking_doctor";
    session.updatedAt = new Date();
    await session.save();
    await sendSafely(phone, "Please share the doctor name.");
    return;
  }

  if (session.step === "booking_doctor") {
    const doctor = await Doctor.findOne({ name: new RegExp(`^${escapeRegex(message)}$`, "i") });

    if (!doctor) {
      await sendSafely(phone, "Doctor not found. Please send the doctor's exact name.");
      return;
    }

    const patient = await Patient.findOneAndUpdate(
      { phone },
      { $setOnInsert: { name: session.tempData.name, phone } },
      { upsert: true, new: true }
    );

    const appointment = await Appointment.create({
      patientId: patient._id,
      doctorId: doctor._id,
      date: session.tempData.date,
      time: session.tempData.time,
      status: "booked",
      reason: "WhatsApp booking"
    });

    const day = getDayName(appointment.date);
    await Promise.all([
      sendSafely(
        phone,
        `Your appointment is confirmed with Dr. ${doctor.name} on ${appointment.date}, ${day} at ${appointment.time}.`
      ),
      sendSafely(
        doctor.phone,
        `New appointment booked. Patient: ${patient.name}. Date: ${appointment.date}. Time: ${appointment.time}. Day: ${day}. Please check your clinic dashboard.`
      )
    ]);

    await resetSession(session);
    return;
  }

  if (session.step === "check_appointment") {
    const formatted = formatIndianPhoneNumber(message);
    const patient = await Patient.findOne({
      $or: [
        ...getPhoneCandidates(formatted).map((candidate) => ({ phone: candidate })),
        { name: new RegExp(escapeRegex(message), "i") }
      ]
    });

    if (!patient) {
      await sendSafely(phone, "No patient record found. Please call the clinic for help.");
      await resetSession(session);
      return;
    }

    const today = normalizeDate(new Date());
    const appointment = await Appointment.findOne({
      patientId: patient._id,
      date: { $gte: today },
      status: { $nin: ["cancelled", "declined"] }
    })
      .sort({ date: 1, time: 1 })
      .populate("doctorId", "name");

    if (!appointment) {
      await sendSafely(phone, "No upcoming appointment found.");
      await resetSession(session);
      return;
    }

    await sendSafely(
      phone,
      `Your next appointment is with Dr. ${appointment.doctorId.name} on ${appointment.date}, ${getDayName(
        appointment.date
      )} at ${appointment.time}. Status: ${appointment.status}.`
    );
    await resetSession(session);
  }
};

const verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
};

const receiveWebhook = asyncHandler(async (req, res) => {
  if (!isValidMetaSignature(req)) {
    return res.sendStatus(403);
  }

  const incoming = extractIncomingMessage(req.body);

  if (!incoming?.phone) {
    const status = extractWebhookStatus(req.body);

    if (status) {
      console.log("WhatsApp status update received", {
        id: status.id,
        recipientId: status.recipient_id,
        status: status.status,
        timestamp: status.timestamp
      });
    }

    return res.sendStatus(200);
  }

  const reply = incoming.text.toUpperCase();
  const pendingAppointment = await findPendingConfirmation(incoming.phone);

  if (pendingAppointment) {
    await handleConfirmationReply(pendingAppointment, reply);
    return res.sendStatus(200);
  }

  await handleBookingBot(incoming.phone, incoming.text);
  return res.sendStatus(200);
});

module.exports = {
  receiveWebhook,
  verifyWebhook
};
