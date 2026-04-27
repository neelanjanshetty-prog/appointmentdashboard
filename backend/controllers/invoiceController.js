const path = require("path");
const mongoose = require("mongoose");

const Invoice = require("../models/Invoice");
const Patient = require("../models/Patient");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const { generateInvoicePdf } = require("../services/pdfService");
const { sendInvoiceWhatsApp } = require("../services/whatsappService");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getToday = () => new Date().toISOString().split("T")[0].replace(/-/g, "");

const generateInvoiceNo = async () => {
  const prefix = `INV-${getToday()}`;
  const latestInvoice = await Invoice.findOne({
    invoiceNo: new RegExp(`^${prefix}-\\d{4}$`)
  })
    .sort({ invoiceNo: -1 })
    .select("invoiceNo")
    .lean();

  const latestSequence = latestInvoice?.invoiceNo ? Number(latestInvoice.invoiceNo.split("-").pop()) : 0;
  return `${prefix}-${String(latestSequence + 1).padStart(4, "0")}`;
};

const calculateInvoiceTotals = (services = [], discount = 0) => {
  const sanitizedServices = services
    .filter((service) => service?.name || service?.service)
    .map((service) => ({
      service: service.service || service.name,
      name: service.name || service.service,
      price: Number(service.price || 0)
    }));
  const subtotal = sanitizedServices.reduce((sum, service) => sum + Number(service.price || 0), 0);
  const safeDiscount = Number(discount || 0);
  const totalAmount = Math.max(subtotal - safeDiscount, 0);
  return {
    services: sanitizedServices,
    subtotal,
    discount: safeDiscount,
    totalAmount,
    total: totalAmount
  };
};

const getPatientQuery = (invoiceOrBody) => {
  if (invoiceOrBody.patientId) {
    return { patientId: invoiceOrBody.patientId };
  }

  return { patientPhone: invoiceOrBody.patientPhone };
};

const getPreviousBalance = async ({ patientId, patientPhone }, excludeId = null) => {
  if (!patientId && !patientPhone) {
    return 0;
  }

  const query = {
    ...getPatientQuery({ patientId, patientPhone }),
    ...(excludeId ? { _id: { $ne: excludeId } } : {})
  };
  const invoices = await Invoice.find(query).select("balanceDue total totalAmount totalPaid amountPaid payments").lean();

  return invoices.reduce((sum, invoice) => {
    return sum + getLegacyAwareTotals(invoice).balanceDue;
  }, 0);
};

const buildPaymentSummary = ({ totalAmount, previousBalance = 0, payments = [] }) => {
  const totalPayable = Number(totalAmount || 0) + Number(previousBalance || 0);
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const overPaid = Math.max(totalPaid - totalPayable, 0);
  const balanceDue = Math.max(totalPayable - totalPaid, 0);
  const amountPaid = payments[payments.length - 1]?.amount || 0;
  const paymentStatus = balanceDue <= 0 ? "Paid" : totalPaid > 0 ? "Partially Paid" : "Unpaid";

  return {
    amountPaid,
    totalPaid,
    balanceDue,
    advancePaid: overPaid,
    paymentStatus
  };
};

const getTotalPayable = (totalAmount, previousBalance = 0) => Number(totalAmount || 0) + Number(previousBalance || 0);

const getPaymentsTotal = (payments = []) => payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

const buildInitialPayments = ({ amountPaid, paymentMode, note, receivedBy }) => {
  const paid = Number(amountPaid || 0);

  if (paid <= 0) {
    return [];
  }

  return [
    {
      amount: paid,
      paymentMode,
      paymentDate: new Date(),
      note: note || "Initial payment",
      receivedBy
    }
  ];
};

const getLegacyAwareTotals = (invoice) => {
  const totalAmount = Number(invoice.totalAmount || invoice.total || 0);
  const totalPaid = Number(invoice.totalPaid ?? invoice.amountPaid ?? 0);
  const balanceDue = invoice.balanceDue !== undefined
    ? Number(invoice.balanceDue || 0)
    : Math.max(totalAmount - totalPaid, 0);

  return {
    totalAmount,
    totalPaid,
    balanceDue
  };
};

const serializeInvoice = (invoice) => {
  const value = invoice.toObject ? invoice.toObject() : { ...invoice };

  if (value.totalAmount === undefined || value.balanceDue === undefined || value.totalPaid === undefined) {
    const { totalAmount, totalPaid, balanceDue } = getLegacyAwareTotals(value);

    return {
      ...value,
      totalAmount,
      total: totalAmount,
      amountPaid: value.amountPaid ?? totalPaid,
      previousBalance: value.previousBalance || 0,
      totalPaid,
      balanceDue,
      advancePaid: Math.max(totalPaid - (totalAmount + Number(value.previousBalance || 0)), 0),
      paymentStatus: balanceDue <= 0 ? "Paid" : totalPaid > 0 ? "Partially Paid" : "Unpaid",
      payments: value.payments?.length
        ? value.payments
        : totalPaid > 0
          ? [{
              amount: totalPaid,
              paymentMode: value.paymentMode,
              paymentDate: value.createdAt,
              note: "Recorded invoice payment"
            }]
          : []
    };
  }

  return value;
};

const createOrUpdatePdf = async (invoice) => {
  const normalizedInvoice = serializeInvoice(invoice);
  Object.assign(invoice, {
    totalAmount: normalizedInvoice.totalAmount,
    total: normalizedInvoice.total,
    amountPaid: normalizedInvoice.amountPaid,
    previousBalance: normalizedInvoice.previousBalance,
    totalPaid: normalizedInvoice.totalPaid,
    balanceDue: normalizedInvoice.balanceDue,
    advancePaid: normalizedInvoice.advancePaid,
    paymentStatus: normalizedInvoice.paymentStatus,
    payments: normalizedInvoice.payments
  });
  const { relativePath } = await generateInvoicePdf(normalizedInvoice);
  invoice.pdfPath = relativePath;
  await invoice.save();
  return invoice;
};

const getInvoices = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find().populate("patientId", "name phone email").sort({ createdAt: -1 });
  return res.status(200).json(successResponse("Invoices retrieved successfully", invoices.map(serializeInvoice)));
});

const createInvoice = asyncHandler(async (req, res) => {
  const { patientName, patientId, patientPhone, services, discount, paymentMode, amountPaid, notes } = req.body;

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

  if (!totals.services.length) {
    return res.status(400).json(errorResponse("At least one service is required"));
  }

  const previousBalance = await getPreviousBalance({ patientId, patientPhone });
  const totalPayable = getTotalPayable(totals.totalAmount, previousBalance);

  if (Number(amountPaid || 0) > totalPayable) {
    return res.status(400).json(errorResponse("Amount paid cannot be greater than the total payable amount"));
  }

  const payments = buildInitialPayments({
    amountPaid,
    paymentMode,
    note: notes,
    receivedBy: req.user?._id
  });
  const paymentSummary = buildPaymentSummary({
    totalAmount: totals.totalAmount,
    previousBalance,
    payments
  });

  let invoice = await Invoice.create({
    invoiceNo: req.body.invoiceNo || (await generateInvoiceNo()),
    patientName,
    patientId,
    patientPhone,
    services: totals.services,
    discount: totals.discount,
    subtotal: totals.subtotal,
    totalAmount: totals.totalAmount,
    total: totals.total,
    amountPaid: paymentSummary.amountPaid,
    previousBalance,
    totalPaid: paymentSummary.totalPaid,
    balanceDue: paymentSummary.balanceDue,
    advancePaid: paymentSummary.advancePaid,
    paymentStatus: paymentSummary.paymentStatus,
    paymentMode,
    notes,
    payments
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

  return res.status(200).json(successResponse("Invoice retrieved successfully", serializeInvoice(invoice)));
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
  delete updateData.invoiceNo;
  const services = updateData.services || invoice.services;
  const discount = updateData.discount !== undefined ? updateData.discount : invoice.discount;
  const totals = calculateInvoiceTotals(services, discount);

  if (!totals.services.length) {
    return res.status(400).json(errorResponse("At least one service is required"));
  }

  const previousBalance = await getPreviousBalance(
    {
      patientId: updateData.patientId || invoice.patientId,
      patientPhone: updateData.patientPhone || invoice.patientPhone
    },
    invoice._id
  );
  const payments = Array.isArray(updateData.payments) ? updateData.payments : [...(invoice.payments || [])];

  if (updateData.amountPaid !== undefined) {
    const paid = Number(updateData.amountPaid || 0);
    if (paid > 0) {
      const initialPayment = {
        amount: paid,
        paymentMode: updateData.paymentMode || invoice.paymentMode,
        paymentDate: payments[0]?.paymentDate || invoice.createdAt || new Date(),
        note: payments[0]?.note || updateData.notes || "Initial payment",
        receivedBy: payments[0]?.receivedBy
      };
      payments.splice(0, payments.length ? 1 : 0, initialPayment);
    } else if (payments.length) {
      payments.shift();
    }
  }

  if (getPaymentsTotal(payments) > getTotalPayable(totals.totalAmount, previousBalance)) {
    return res.status(400).json(errorResponse("Total payments cannot be greater than the total payable amount"));
  }

  const paymentSummary = buildPaymentSummary({
    totalAmount: totals.totalAmount,
    previousBalance,
    payments
  });

  Object.assign(invoice, updateData, totals, {
    services: totals.services,
    payments,
    previousBalance,
    ...paymentSummary
  });
  if (!invoice.invoiceNo) {
    invoice.invoiceNo = await generateInvoiceNo();
  }
  await invoice.save();
  await createOrUpdatePdf(invoice);

  return res.status(200).json(successResponse("Invoice updated successfully", invoice));
});

const recordInvoicePayment = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid invoice ID"));
  }

  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return res.status(404).json(errorResponse("Invoice not found"));
  }

  const amount = Number(req.body.amount || 0);

  if (amount <= 0) {
    return res.status(400).json(errorResponse("Payment amount must be greater than 0"));
  }

  const normalizedInvoice = serializeInvoice(invoice);
  const currentBalance = Number(normalizedInvoice.balanceDue || 0);

  if (amount > currentBalance) {
    return res.status(400).json(errorResponse("Payment amount cannot be greater than the balance due"));
  }

  invoice.payments.push({
    amount,
    paymentMode: req.body.paymentMode || invoice.paymentMode,
    paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
    note: req.body.note,
    receivedBy: req.user?._id
  });

  invoice.previousBalance = invoice.previousBalance || 0;
  const paymentSummary = buildPaymentSummary({
    totalAmount: normalizedInvoice.totalAmount || invoice.total,
    previousBalance: normalizedInvoice.previousBalance,
    payments: invoice.payments
  });
  Object.assign(invoice, paymentSummary, {
    paymentMode: req.body.paymentMode || invoice.paymentMode
  });
  await invoice.save();
  await createOrUpdatePdf(invoice);

  return res.status(200).json(successResponse("Payment recorded successfully", invoice));
});

const getInvoicePayments = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid invoice ID"));
  }

  const invoice = await Invoice.findById(req.params.id).select("payments");

  if (!invoice) {
    return res.status(404).json(errorResponse("Invoice not found"));
  }

  return res.status(200).json(successResponse("Invoice payments retrieved successfully", invoice.payments || []));
});

const getPatientInvoiceBalance = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.patientId)) {
    return res.status(400).json(errorResponse("Invalid patient ID"));
  }

  const invoices = await Invoice.find({ patientId: req.params.patientId }).select("total totalAmount totalPaid amountPaid balanceDue payments").lean();
  const totalBilled = invoices.reduce((sum, invoice) => sum + getLegacyAwareTotals(invoice).totalAmount, 0);
  const totalPaid = invoices.reduce((sum, invoice) => sum + getLegacyAwareTotals(invoice).totalPaid, 0);
  const outstandingBalance = invoices.reduce((sum, invoice) => sum + getLegacyAwareTotals(invoice).balanceDue, 0);

  return res.status(200).json(
    successResponse("Patient invoice balance retrieved successfully", {
      totalBilled,
      totalPaid,
      outstandingBalance
    })
  );
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

  if (!invoice.invoiceNo) {
    invoice.invoiceNo = await generateInvoiceNo();
    await invoice.save();
  }

  invoice = await createOrUpdatePdf(invoice);
  const absolutePath = path.join(__dirname, "..", invoice.pdfPath.replace(/^\//, ""));

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

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

  if (!invoice.invoiceNo) {
    invoice.invoiceNo = await generateInvoiceNo();
    await invoice.save();
  }

  await createOrUpdatePdf(invoice);

  const defaultBackendUrl =
    process.env.NODE_ENV === "production" ? "https://api.paramsdental.com" : `http://localhost:${process.env.PORT || 5000}`;
  const backendUrl = (process.env.BACKEND_URL || defaultBackendUrl).replace(/\/$/, "");
  const pdfUrl = `${backendUrl}${invoice.pdfPath}`;

  const whatsappResult = await sendInvoiceWhatsApp(invoice.patientPhone, pdfUrl, invoice.patientName, invoice.balanceDue || invoice.totalAmount || invoice.total);

  if (whatsappResult?.skipped || whatsappResult?.failed) {
    return res.status(502).json(
      errorResponse("Invoice PDF was created, but WhatsApp delivery failed", {
        pdfUrl,
        whatsapp: whatsappResult
      })
    );
  }

  return res.status(200).json(successResponse("Invoice sent on WhatsApp", { pdfUrl }));
});

module.exports = {
  getInvoices,
  createInvoice,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  downloadInvoicePdf,
  sendInvoiceOnWhatsApp,
  recordInvoicePayment,
  getInvoicePayments,
  getPatientInvoiceBalance
};
