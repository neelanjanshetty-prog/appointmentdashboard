const mongoose = require("mongoose");

const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const Prescription = require("../models/Prescription");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const { normalizeDate } = require("../utils/dateUtils");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const prescriptionPopulate = [
  { path: "patientId", select: "name phone email" },
  { path: "doctorId", select: "name specialization phone email" },
  { path: "appointmentId", select: "date time reason status" }
];

const getToday = () => normalizeDate(new Date());

const generatePrescriptionNo = async () => {
  const today = getToday().replace(/-/g, "");
  const prefix = `RX-${today}`;
  const latestPrescription = await Prescription.findOne({
    prescriptionNo: new RegExp(`^${prefix}-\\d{4}$`)
  })
    .sort({ prescriptionNo: -1 })
    .select("prescriptionNo")
    .lean();

  const latestSequence = latestPrescription?.prescriptionNo
    ? Number(latestPrescription.prescriptionNo.split("-").pop())
    : 0;

  return `${prefix}-${String(latestSequence + 1).padStart(4, "0")}`;
};

const sanitizeMedicines = (medicines = []) =>
  medicines
    .filter((medicine) => medicine?.medicineName)
    .map((medicine) => ({
      medicineName: medicine.medicineName,
      strength: medicine.strength,
      dosageForm: medicine.dosageForm,
      dose: medicine.dose,
      frequency: medicine.frequency,
      duration: medicine.duration,
      instructions: medicine.instructions
    }));

const buildPrescriptionPayload = async (body, existingPrescription = null) => {
  const patientId = body.patientId || existingPrescription?.patientId;
  const doctorId = body.doctorId || existingPrescription?.doctorId;
  const appointmentId = body.appointmentId || existingPrescription?.appointmentId || undefined;

  if (!patientId || !doctorId) {
    return { error: "patientId and doctorId are required" };
  }

  if (!isValidObjectId(patientId) || !isValidObjectId(doctorId)) {
    return { error: "Invalid patient or doctor ID" };
  }

  if (appointmentId && !isValidObjectId(appointmentId)) {
    return { error: "Invalid appointment ID" };
  }

  const [patient, doctor, appointment] = await Promise.all([
    Patient.findById(patientId),
    Doctor.findById(doctorId),
    appointmentId ? Appointment.findById(appointmentId) : null
  ]);

  if (!patient) {
    return { error: "Patient not found", statusCode: 404 };
  }

  if (!doctor) {
    return { error: "Doctor not found", statusCode: 404 };
  }

  if (appointmentId && !appointment) {
    return { error: "Appointment not found", statusCode: 404 };
  }

  const date = normalizeDate(body.date || existingPrescription?.date || new Date());

  if (!date) {
    return { error: "Invalid prescription date" };
  }

  const followUpDate = body.followUpDate ? normalizeDate(body.followUpDate) : body.followUpDate;

  if (body.followUpDate && !followUpDate) {
    return { error: "Invalid follow-up date" };
  }

  return {
    payload: {
      date,
      patientId,
      appointmentId: appointmentId || undefined,
      patientName: body.patientName || patient.name,
      patientAge: body.patientAge,
      patientGender: body.patientGender,
      patientPhone: body.patientPhone || patient.phone,
      doctorId,
      doctorName: body.doctorName || doctor.name,
      doctorQualification: body.doctorQualification || doctor.specialization,
      doctorRegistrationNo: body.doctorRegistrationNo,
      chiefComplaint: body.chiefComplaint,
      diagnosis: body.diagnosis,
      treatmentNotes: body.treatmentNotes,
      medicines: sanitizeMedicines(body.medicines),
      specialInstructions: body.specialInstructions,
      followUpDate
    }
  };
};

const createPrescription = asyncHandler(async (req, res) => {
  const { payload, error, statusCode } = await buildPrescriptionPayload(req.body);

  if (error) {
    return res.status(statusCode || 400).json(errorResponse(error));
  }

  const prescription = await Prescription.create({
    ...payload,
    prescriptionNo: req.body.prescriptionNo || (await generatePrescriptionNo()),
    createdBy: req.user?._id
  });

  const populatedPrescription = await Prescription.findById(prescription._id).populate(prescriptionPopulate);

  return res.status(201).json(successResponse("Prescription created successfully", populatedPrescription));
});

const getPrescriptions = asyncHandler(async (req, res) => {
  const prescriptions = await Prescription.find()
    .populate(prescriptionPopulate)
    .sort({ date: -1, createdAt: -1 });

  return res.status(200).json(successResponse("Prescriptions retrieved successfully", prescriptions));
});

const getPrescriptionById = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid prescription ID"));
  }

  const prescription = await Prescription.findById(req.params.id).populate(prescriptionPopulate);

  if (!prescription) {
    return res.status(404).json(errorResponse("Prescription not found"));
  }

  return res.status(200).json(successResponse("Prescription retrieved successfully", prescription));
});

const updatePrescription = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid prescription ID"));
  }

  const existingPrescription = await Prescription.findById(req.params.id);

  if (!existingPrescription) {
    return res.status(404).json(errorResponse("Prescription not found"));
  }

  const { payload, error, statusCode } = await buildPrescriptionPayload(req.body, existingPrescription);

  if (error) {
    return res.status(statusCode || 400).json(errorResponse(error));
  }

  const prescription = await Prescription.findByIdAndUpdate(
    req.params.id,
    {
      ...payload,
      prescriptionNo: req.body.prescriptionNo || existingPrescription.prescriptionNo
    },
    {
      new: true,
      runValidators: true
    }
  ).populate(prescriptionPopulate);

  return res.status(200).json(successResponse("Prescription updated successfully", prescription));
});

const deletePrescription = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid prescription ID"));
  }

  const prescription = await Prescription.findByIdAndDelete(req.params.id);

  if (!prescription) {
    return res.status(404).json(errorResponse("Prescription not found"));
  }

  return res.status(200).json(successResponse("Prescription deleted successfully"));
});

const getPrescriptionsByPatient = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.patientId)) {
    return res.status(400).json(errorResponse("Invalid patient ID"));
  }

  const prescriptions = await Prescription.find({ patientId: req.params.patientId })
    .populate(prescriptionPopulate)
    .sort({ date: -1, createdAt: -1 });

  return res.status(200).json(successResponse("Patient prescriptions retrieved successfully", prescriptions));
});

const getPrescriptionsByAppointment = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.appointmentId)) {
    return res.status(400).json(errorResponse("Invalid appointment ID"));
  }

  const prescriptions = await Prescription.find({ appointmentId: req.params.appointmentId })
    .populate(prescriptionPopulate)
    .sort({ date: -1, createdAt: -1 });

  return res.status(200).json(successResponse("Appointment prescriptions retrieved successfully", prescriptions));
});

module.exports = {
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
  updatePrescription,
  deletePrescription,
  getPrescriptionsByPatient,
  getPrescriptionsByAppointment
};
