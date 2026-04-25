const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

const Invoice = require("../models/Invoice");
const Patient = require("../models/Patient");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const { generateInvoicePdf } = require("../services/pdfService");
const { sendInvoiceWhatsApp } = require("../services/whatsappService");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const calculateInvoiceTotals = (services = [], discount = 0) => {
  const subtotal = services.reduce((sum, service) => sum + Number(service.price || 0), 0);
  const safeDiscount = Number(discount || 0);
  return {
    subtotal,
    discount: safeDiscount,
    total: Math.max(subtotal - safeDiscount, 0)
  };
};

const createOrUpdatePdf = async (invoice) => {
  const { relativePath } = await generateInvoicePdf(invoice);
  invoice.pdfPath = relativePath;
  await invoice.save();
  return invoice;
};

const getInvoices = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find().populate("patientId", "name phone email").sort({ createdAt: -1 });
  return res.status(200).json(successResponse("Invoices retrieved successfully", invoices));
});

const createInvoice = asyncHandler(async (req, res) => {
  const { patientName, patientId, patientPhone, services, discount, paymentMode } = req.body;

  if (!patientName || !patientPhone || !Array.isArray(services) || !services.length) {
    return res.status(400).json(errorResponse("patientName, patientPhone, and services are required"));
  }

  if (patientId && !isValidObjectId(patientId)) {
    return res.status(400).json(errorResponse("Invalid patient ID"));
  }

  if (patientId) {
    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json(errorResponse("Patient not found"));
    }
  }

  const totals = calculateInvoiceTotals(services, discount);
  let invoice = await Invoice.create({
    patientName,
    patientId,
    patientPhone,
    services,
    discount: totals.discount,
    subtotal: totals.subtotal,
    total: totals.total,
    paymentMode
  });

  invoice = await createOrUpdatePdf(invoice);
  return res.status(201).json(successResponse("Invoice created successfully", invoice));
});

const getInvoiceById = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid invoice ID"));
  }

  const invoice = await Invoice.findById(req.params.id).populate("patientId", "name phone email");

  if (!invoice) {
    return res.status(404).json(errorResponse("Invoice not found"));
  }

  return res.status(200).json(successResponse("Invoice retrieved successfully", invoice));
});

const updateInvoice = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid invoice ID"));
  }

  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return res.status(404).json(errorResponse("Invoice not found"));
  }

  const updateData = { ...req.body };
  const services = updateData.services || invoice.services;
  const discount = updateData.discount !== undefined ? updateData.discount : invoice.discount;
  const totals = calculateInvoiceTotals(services, discount);

  Object.assign(invoice, updateData, totals);
  await invoice.save();
  await createOrUpdatePdf(invoice);

  return res.status(200).json(successResponse("Invoice updated successfully", invoice));
});

const deleteInvoice = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid invoice ID"));
  }

  const invoice = await Invoice.findByIdAndDelete(req.params.id);

  if (!invoice) {
    return res.status(404).json(errorResponse("Invoice not found"));
  }

  return res.status(200).json(successResponse("Invoice deleted successfully"));
});

const downloadInvoicePdf = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid invoice ID"));
  }

  let invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return res.status(404).json(errorResponse("Invoice not found"));
  }

  let absolutePath = invoice.pdfPath ? path.join(__dirname, "..", invoice.pdfPath.replace(/^\//, "")) : null;

  if (!invoice.pdfPath || !absolutePath || !fs.existsSync(absolutePath)) {
    invoice = await createOrUpdatePdf(invoice);
    absolutePath = path.join(__dirname, "..", invoice.pdfPath.replace(/^\//, ""));
  }

  return res.download(absolutePath);
});

const sendInvoiceOnWhatsApp = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid invoice ID"));
  }

  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return res.status(404).json(errorResponse("Invoice not found"));
  }

  const absolutePath = invoice.pdfPath ? path.join(__dirname, "..", invoice.pdfPath.replace(/^\//, "")) : null;

  if (!invoice.pdfPath || !absolutePath || !fs.existsSync(absolutePath)) {
    await createOrUpdatePdf(invoice);
  }

  const backendUrl = (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, "");
  const pdfUrl = `${backendUrl}${invoice.pdfPath}`;

  await sendInvoiceWhatsApp(invoice.patientPhone, pdfUrl, invoice.patientName, invoice.total);

  return res.status(200).json(successResponse("Invoice sent on WhatsApp", { pdfUrl }));
});

module.exports = {
  getInvoices,
  createInvoice,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  downloadInvoicePdf,
  sendInvoiceOnWhatsApp
};
