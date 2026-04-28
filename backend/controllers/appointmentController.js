const mongoose = require("mongoose");

const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const { getDayName, normalizeDate } = require("../utils/dateUtils");
const { sendWhatsAppMessage } = require("../services/whatsappService");
const logger = require("../utils/logger");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const appointmentPopulate = [
  { path: "patientId", select: "name phone email" },
  { path: "doctorId", select: "name specialization phone email" },
  { path: "parentAppointmentId", select: "date time reason followUpType status" }
];

const sendWhatsAppSafely = async (phone, message) => {
  try {
    await sendWhatsAppMessage(phone, message);
  } catch (error) {
    logger.warn("WhatsApp send failed during appointment workflow", { error, phone });
  }
};

const buildAppointmentMessage = ({ doctorName, date, time }) => {
  const day = getDayName(date);
  return `Your appointment is confirmed with Dr. ${doctorName} on ${date}, ${day} at ${time}.`;
};

const buildDoctorMessage = ({ patientName, date, time }) => {
  const day = getDayName(date);
  return `New appointment booked. Patient: ${patientName}. Date: ${date}. Time: ${time}. Day: ${day}. Please check your clinic dashboard.`;
};

const buildFollowUpRequestMessage = ({ doctorName, date, time, followUpType }) => {
  const day = getDayName(date);
  return `Do you confirm your next dental appointment with Dr. ${doctorName} on ${date}, ${day} at ${time} for ${followUpType}?\n\nReply:\nYES to confirm\nNO to decline`;
};

const getAppointments = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find()
    .populate(appointmentPopulate)
    .sort({ date: -1, time: -1, createdAt: -1 });

  return res.status(200).json(successResponse("Appointments retrieved successfully", appointments));
});

const createAppointment = asyncHandler(async (req, res) => {
  const { patientId, doctorId, date, time, reason, notes } = req.body;

  if (!patientId || !doctorId || !date || !time) {
    return res.status(400).json(errorResponse("patientId, doctorId, date, and time are required"));
  }

  if (!isValidObjectId(patientId) || !isValidObjectId(doctorId)) {
    return res.status(400).json(errorResponse("Invalid patient or doctor ID"));
  }

  const normalizedDate = normalizeDate(date);

  if (!normalizedDate) {
    return res.status(400).json(errorResponse("Invalid appointment date"));
  }

  const [patient, doctor] = await Promise.all([
    Patient.findById(patientId),
    Doctor.findById(doctorId)
  ]);

  if (!patient) {
    return res.status(404).json(errorResponse("Patient not found"));
  }

  if (!doctor) {
    return res.status(404).json(errorResponse("Doctor not found"));
  }

  const appointment = await Appointment.create({
    patientId,
    doctorId,
    date: normalizedDate,
    time,
    reason,
    notes,
    status: "booked"
  });

  const populatedAppointment = await Appointment.findById(appointment._id).populate(appointmentPopulate);

  await Promise.all([
    sendWhatsAppSafely(
      patient.phone,
      buildAppointmentMessage({
        doctorName: doctor.name,
        date: normalizedDate,
        time
      })
    ),
    sendWhatsAppSafely(
      doctor.phone,
      buildDoctorMessage({
        patientName: patient.name,
        date: normalizedDate,
        time
      })
    )
  ]);

  return res.status(201).json(successResponse("Appointment created successfully", populatedAppointment));
});

const getAppointmentById = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid appointment ID"));
  }

  const appointment = await Appointment.findById(req.params.id).populate(appointmentPopulate);

  if (!appointment) {
    return res.status(404).json(errorResponse("Appointment not found"));
  }

  return res.status(200).json(successResponse("Appointment retrieved successfully", appointment));
});

const updateAppointment = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid appointment ID"));
  }

  const updateData = { ...req.body };

  if (updateData.date) {
    updateData.date = normalizeDate(updateData.date);

    if (!updateData.date) {
      return res.status(400).json(errorResponse("Invalid appointment date"));
    }
  }

  const appointment = await Appointment.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true
  }).populate(appointmentPopulate);

  if (!appointment) {
    return res.status(404).json(errorResponse("Appointment not found"));
  }

  return res.status(200).json(successResponse("Appointment updated successfully", appointment));
});

const deleteAppointment = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid appointment ID"));
  }

  const appointment = await Appointment.findByIdAndDelete(req.params.id);

  if (!appointment) {
    return res.status(404).json(errorResponse("Appointment not found"));
  }

  return res.status(200).json(successResponse("Appointment deleted successfully"));
});

const createFollowUpAppointment = asyncHandler(async (req, res) => {
  const { date, time, doctorId, followUpType, notes } = req.body;

  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid appointment ID"));
  }

  if (!date || !time || !doctorId || !followUpType) {
    return res.status(400).json(errorResponse("date, time, doctorId, and followUpType are required"));
  }

  if (!isValidObjectId(doctorId)) {
    return res.status(400).json(errorResponse("Invalid doctor ID"));
  }

  const normalizedDate = normalizeDate(date);

  if (!normalizedDate) {
    return res.status(400).json(errorResponse("Invalid follow-up date"));
  }

  const originalAppointment = await Appointment.findById(req.params.id);

  if (!originalAppointment) {
    return res.status(404).json(errorResponse("Original appointment not found"));
  }

  const [patient, doctor] = await Promise.all([
    Patient.findById(originalAppointment.patientId),
    Doctor.findById(doctorId)
  ]);

  if (!patient) {
    return res.status(404).json(errorResponse("Patient not found"));
  }

  if (!doctor) {
    return res.status(404).json(errorResponse("Doctor not found"));
  }

  const followUpAppointment = await Appointment.create({
    patientId: originalAppointment.patientId,
    doctorId,
    date: normalizedDate,
    time,
    status: "pending_confirmation",
    reason: followUpType,
    notes,
    followUpType,
    parentAppointmentId: originalAppointment._id,
    reminderSent: false,
    confirmationStatus: "pending",
    confirmationRequestedAt: new Date()
  });

  originalAppointment.followUpNeeded = true;
  await originalAppointment.save();

  await sendWhatsAppSafely(
    patient.phone,
    buildFollowUpRequestMessage({
      doctorName: doctor.name,
      date: normalizedDate,
      time,
      followUpType
    })
  );

  const populatedFollowUpAppointment = await Appointment.findById(followUpAppointment._id).populate(
    appointmentPopulate
  );

  return res
    .status(201)
    .json(successResponse("Follow-up appointment created successfully", populatedFollowUpAppointment));
});

module.exports = {
  getAppointments,
  createAppointment,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
  createFollowUpAppointment
};
