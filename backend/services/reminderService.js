const cron = require("node-cron");

const Appointment = require("../models/Appointment");
const { getDayName } = require("../utils/dateUtils");
const logger = require("../utils/logger");
const { sendWhatsAppMessage } = require("./whatsappService");

let reminderJob = null;

const toAppointmentDateTime = (appointment) => new Date(`${appointment.date}T${appointment.time}:00`);

const sendReminderSafely = async (phone, message) => {
  try {
    await sendWhatsAppMessage(phone, message);
  } catch (error) {
    logger.warn("Reminder WhatsApp failed", { error, phone });
  }
};

const processAppointmentReminders = async () => {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const appointments = await Appointment.find({
    reminderSent: false,
    status: { $in: ["booked", "confirmed"] }
  })
    .populate("patientId", "name phone")
    .populate("doctorId", "name phone");

  for (const appointment of appointments) {
    const appointmentDateTime = toAppointmentDateTime(appointment);

    if (Number.isNaN(appointmentDateTime.getTime())) {
      continue;
    }

    if (appointmentDateTime < now || appointmentDateTime > oneHourLater) {
      continue;
    }

    const patient = appointment.patientId;
    const doctor = appointment.doctorId;
    const day = getDayName(appointment.date);

    await Promise.all([
      sendReminderSafely(
        patient?.phone,
        `Reminder: Your dental appointment with Dr. ${doctor?.name} is today, ${appointment.date}, ${day} at ${appointment.time}.`
      ),
      sendReminderSafely(
        doctor?.phone,
        `Reminder: Appointment with patient ${patient?.name} is today, ${appointment.date}, ${day} at ${appointment.time}.`
      )
    ]);

    appointment.reminderSent = true;
    await appointment.save();
  }
};

const startReminderService = () => {
  if (reminderJob) {
    return reminderJob;
  }

  reminderJob = cron.schedule("* * * * *", () => {
    processAppointmentReminders().catch((error) => {
      logger.error("Reminder service error", { error });
    });
  });

  logger.info("Reminder service started");
  return reminderJob;
};

module.exports = {
  processAppointmentReminders,
  startReminderService
};
