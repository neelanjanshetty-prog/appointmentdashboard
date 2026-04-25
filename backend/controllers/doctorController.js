const mongoose = require("mongoose");

const Doctor = require("../models/Doctor");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getDoctors = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find().sort({ createdAt: -1 });

  return res.status(200).json(successResponse("Doctors retrieved successfully", doctors));
});

const createDoctor = asyncHandler(async (req, res) => {
  const { name, specialization, phone, email } = req.body;

  if (!name || !specialization) {
    return res.status(400).json(errorResponse("Doctor name and specialization are required"));
  }

  const doctor = await Doctor.create({ name, specialization, phone, email });

  return res.status(201).json(successResponse("Doctor created successfully", doctor));
});

const getDoctorById = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid doctor ID"));
  }

  const doctor = await Doctor.findById(req.params.id);

  if (!doctor) {
    return res.status(404).json(errorResponse("Doctor not found"));
  }

  return res.status(200).json(successResponse("Doctor retrieved successfully", doctor));
});

const updateDoctor = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid doctor ID"));
  }

  const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!doctor) {
    return res.status(404).json(errorResponse("Doctor not found"));
  }

  return res.status(200).json(successResponse("Doctor updated successfully", doctor));
});

const deleteDoctor = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid doctor ID"));
  }

  const doctor = await Doctor.findByIdAndDelete(req.params.id);

  if (!doctor) {
    return res.status(404).json(errorResponse("Doctor not found"));
  }

  return res.status(200).json(successResponse("Doctor deleted successfully"));
});

module.exports = {
  getDoctors,
  createDoctor,
  getDoctorById,
  updateDoctor,
  deleteDoctor
};
