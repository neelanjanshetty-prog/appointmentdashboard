const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    medicineName: {
      type: String,
      required: true,
      trim: true
    },
    strength: {
      type: String,
      trim: true
    },
    dosageForm: {
      type: String,
      trim: true
    },
    dose: {
      type: String,
      trim: true
    },
    frequency: {
      type: String,
      trim: true
    },
    duration: {
      type: String,
      trim: true
    },
    instructions: {
      type: String,
      trim: true
    }
  },
  {
    _id: false
  }
);

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionNo: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    date: {
      type: String,
      required: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment"
    },
    patientName: {
      type: String,
      required: true,
      trim: true
    },
    patientAge: {
      type: String,
      trim: true
    },
    patientGender: {
      type: String,
      trim: true
    },
    patientPhone: {
      type: String,
      trim: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true
    },
    doctorName: {
      type: String,
      required: true,
      trim: true
    },
    doctorQualification: {
      type: String,
      trim: true
    },
    doctorRegistrationNo: {
      type: String,
      trim: true
    },
    chiefComplaint: {
      type: String,
      trim: true
    },
    diagnosis: {
      type: String,
      trim: true
    },
    treatmentNotes: {
      type: String,
      trim: true
    },
    medicines: {
      type: [medicineSchema],
      default: []
    },
    specialInstructions: {
      type: String,
      trim: true
    },
    followUpDate: {
      type: String
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.model("Prescription", prescriptionSchema);
