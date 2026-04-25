const mongoose = require("mongoose");

const Appointment = require("../models/Appointment");
const Invoice = require("../models/Invoice");
const Patient = require("../models/Patient");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getPatients = asyncHandler(async (req, res) => {
  const patients = await Patient.find().sort({ createdAt: -1 });

  return res.status(200).json(successResponse("Patients retrieved successfully", patients));
});

const createPatient = asyncHandler(async (req, res) => {
  const { name, phone, email } = req.body;

  if (!name || !phone) {
    return res.status(400).json(errorResponse("Patient name and phone are required"));
  }

  const patient = await Patient.create({ name, phone, email });

  return res.status(201).json(successResponse("Patient created successfully", patient));
});

const getPatientById = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid patient ID"));
  }

  const patient = await Patient.findById(req.params.id);

  if (!patient) {
    return res.status(404).json(errorResponse("Patient not found"));
  }

  return res.status(200).json(successResponse("Patient retrieved successfully", patient));
});

const updatePatient = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid patient ID"));
  }

  const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!patient) {
    return res.status(404).json(errorResponse("Patient not found"));
  }

  return res.status(200).json(successResponse("Patient updated successfully", patient));
});

const deletePatient = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid patient ID"));
  }

  const patient = await Patient.findByIdAndDelete(req.params.id);

  if (!patient) {
    return res.status(404).json(errorResponse("Patient not found"));
  }

  return res.status(200).json(successResponse("Patient deleted successfully"));
});

const getPatientTimeline = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid patient ID"));
  }

  const patient = await Patient.findById(req.params.id);

  if (!patient) {
    return res.status(404).json(errorResponse("Patient not found"));
  }

  const appointments = await Appointment.find({ patientId: patient._id })
    .populate("doctorId", "name specialization phone email")
    .sort({ date: -1, time: -1, createdAt: -1 });
  const invoices = await Invoice.find({ patientId: patient._id }).sort({ createdAt: -1 });

  return res.status(200).json(
    successResponse("Patient timeline retrieved successfully", {
      patient,
      appointments,
      invoices
    })
  );
});

module.exports = {
  getPatients,
  createPatient,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientTimeline
};
