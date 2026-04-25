const mongoose = require("mongoose");

const appointmentStatuses = [
  "booked",
  "pending_confirmation",
  "confirmed",
  "completed",
  "cancelled",
  "declined"
];

const confirmationStatuses = ["none", "pending", "confirmed", "declined"];

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true
    },
    date: {
      type: String,
      required: true,
      trim: true
    },
    time: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: appointmentStatuses,
      default: "booked"
    },
    reason: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    followUpNeeded: {
      type: Boolean,
      default: false
    },
    followUpType: {
      type: String,
      trim: true
    },
    parentAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment"
    },
    reminderSent: {
      type: Boolean,
      default: false
    },
    confirmationStatus: {
      type: String,
      enum: confirmationStatuses,
      default: "none"
    },
    confirmationRequestedAt: {
      type: Date
    },
    confirmedAt: {
      type: Date
    },
    declinedAt: {
      type: Date
    },
    patientReply: {
      type: String,
      trim: true
    },
    clinicNotified: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
