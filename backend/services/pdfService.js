const fs = require("fs");
const path = require("path");

const PDFDocument = require("pdfkit");
const logger = require("../utils/logger");

const invoicesDir = path.join(__dirname, "..", "uploads", "invoices");

const formatCurrency = (amount) => `Rs. ${Number(amount || 0).toFixed(2)}`;

const generateInvoicePdf = (invoice) =>
  new Promise((resolve, reject) => {
    try {
      fs.mkdirSync(invoicesDir, { recursive: true });
    } catch (error) {
      logger.error("Invoice PDF directory creation failed", {
        invoiceId: invoice?._id,
        invoicesDir,
        error
      });
      reject(error);
      return;
    }

    const filename = `invoice-${invoice._id}.pdf`;
    const absolutePath = path.join(invoicesDir, filename);
    const relativePath = `/uploads/invoices/${filename}`;
    const doc = new PDFDocument({ margin: 48 });
    const stream = fs.createWriteStream(absolutePath);

    stream.on("finish", () => {
      logger.info("Invoice PDF generated", {
        invoiceId: invoice?._id,
        relativePath
      });
      resolve({ absolutePath, relativePath });
    });
    stream.on("error", (error) => {
      logger.error("Invoice PDF stream failed", {
        invoiceId: invoice?._id,
        absolutePath,
        error
      });
      reject(error);
    });
    doc.on("error", (error) => {
      logger.error("Invoice PDF generation failed", {
        invoiceId: invoice?._id,
        error
      });
      reject(error);
    });

    doc.pipe(stream);

    doc.fontSize(22).text("Dental Clinic", { align: "center" });
    doc.fontSize(10).text("Logo Placeholder", { align: "center" });
    doc.moveDown(2);

    doc.fontSize(16).text("Invoice", { underline: true });
    doc.moveDown();
    doc.fontSize(11).text(`Patient: ${invoice.patientName}`);
    doc.text(`Phone: ${invoice.patientPhone}`);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString("en-IN")}`);
    doc.text(`Payment Mode: ${invoice.paymentMode || "Not specified"}`);
    doc.moveDown();

    const tableTop = doc.y + 10;
    doc.fontSize(12).text("Service", 48, tableTop);
    doc.text("Price", 440, tableTop, { width: 90, align: "right" });
    doc.moveTo(48, tableTop + 18).lineTo(548, tableTop + 18).stroke();

    let y = tableTop + 30;
    invoice.services.forEach((service) => {
      doc.fontSize(11).text(service.name, 48, y, { width: 340 });
      doc.text(formatCurrency(service.price), 440, y, { width: 90, align: "right" });
      y += 24;
    });

    doc.moveTo(48, y).lineTo(548, y).stroke();
    y += 18;
    doc.text("Subtotal", 340, y, { width: 100, align: "right" });
    doc.text(formatCurrency(invoice.subtotal), 440, y, { width: 90, align: "right" });
    y += 20;
    doc.text("Discount", 340, y, { width: 100, align: "right" });
    doc.text(formatCurrency(invoice.discount), 440, y, { width: 90, align: "right" });
    y += 20;
    doc.fontSize(13).text("Total", 340, y, { width: 100, align: "right" });
    doc.text(formatCurrency(invoice.total), 440, y, { width: 90, align: "right" });

    doc.moveDown(4);
    doc.fontSize(10).text("Thank you for visiting our clinic.", { align: "center" });

    doc.end();
  });

module.exports = {
  generateInvoicePdf
};
