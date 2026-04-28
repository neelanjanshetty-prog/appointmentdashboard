const express = require("express");

const {
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
} = require("../controllers/invoiceController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.route("/").get(getInvoices).post(createInvoice);
router.get("/patient/:patientId/balance", getPatientInvoiceBalance);
router.get("/:id/pdf", downloadInvoicePdf);
router.route("/:id/payments").get(getInvoicePayments).post(recordInvoicePayment);
router.post("/:id/send-whatsapp", sendInvoiceOnWhatsApp);
router.route("/:id").get(getInvoiceById).put(updateInvoice).delete(deleteInvoice);

module.exports = router;
