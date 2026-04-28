const fs = require("fs");
const path = require("path");

const PDFDocument = require("pdfkit");

const invoicesDir = path.join(__dirname, "..", "uploads", "invoices");
const logoPath = path.join(__dirname, "..", "..", "frontend", "public", "clinic-logo.jpg");

const formatCurrency = (amount) => `Rs. ${Number(amount || 0).toFixed(2)}`;
const formatDate = (date) => new Date(date || Date.now()).toLocaleDateString("en-IN");
const getInvoiceNo = (invoice) => invoice.invoiceNo || `INV-${String(invoice._id).slice(-8).toUpperCase()}`;
const sanitizeFilename = (value) => String(value).replace(/[^a-z0-9-_]/gi, "-");
const getServiceName = (service) => service.service || service.name || "-";

const drawDivider = (doc, y, color = "#E2E8F0") => {
  doc.save().strokeColor(color).lineWidth(1).moveTo(48, y).lineTo(547, y).stroke().restore();
};

const drawLabelValue = (doc, label, value, x, y, width = 220) => {
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#64748B").text(label.toUpperCase(), x, y, { width });
  doc.font("Helvetica").fontSize(11).fillColor("#0F172A").text(value || "-", x, y + 14, { width });
};

const generateInvoicePdf = (invoice) =>
  new Promise((resolve, reject) => {
    fs.mkdirSync(invoicesDir, { recursive: true });

    const invoiceNo = getInvoiceNo(invoice);
    const filename = `Params-Dental-Invoice-${sanitizeFilename(invoiceNo)}-${Date.now()}.pdf`;
    const absolutePath = path.join(invoicesDir, filename);
    const relativePath = `/uploads/invoices/${filename}`;
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const stream = fs.createWriteStream(absolutePath);

    stream.on("finish", () => resolve({ absolutePath, relativePath }));
    stream.on("error", reject);
    doc.on("error", reject);

    doc.pipe(stream);

    doc.rect(0, 0, 595.28, 841.89).fill("#FFFFFF");
    doc.roundedRect(36, 32, 523, 112, 16).fill("#F8FAFC");

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 56, 48, { fit: [92, 58], align: "center" });
    }

    doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(13).text(
      "PARAMS DENTAL MULTI SPECIALITY CLINIC AND ORTHODONTIC CENTRE",
      166,
      50,
      { width: 350, align: "left" }
    );
    doc.font("Helvetica").fontSize(10).fillColor("#475569").text("Digital Invoice / Payment Receipt", 166, 72, { width: 350 });
    doc.text("Phone: 8123338324", 166, 92, { width: 350 });
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#1D4ED8").text("INVOICE", 436, 105, { width: 88, align: "right" });

    drawDivider(doc, 166);

    drawLabelValue(doc, "Invoice number", invoiceNo, 48, 184);
    drawLabelValue(doc, "Invoice date", formatDate(invoice.createdAt), 300, 184);
    drawLabelValue(doc, "Patient name", invoice.patientName, 48, 232);
    drawLabelValue(doc, "Patient phone", invoice.patientPhone, 300, 232);
    drawLabelValue(doc, "Payment mode", invoice.paymentMode || "Not specified", 48, 280);

    let y = 344;
    doc.roundedRect(48, y - 12, 499, 30, 8).fill("#EFF6FF");
    doc.fillColor("#1E3A8A").font("Helvetica-Bold").fontSize(10);
    doc.text("Sl No", 64, y - 3, { width: 48 });
    doc.text("Service", 126, y - 3, { width: 286 });
    doc.text("Price", 430, y - 3, { width: 88, align: "right" });

    y += 30;
    doc.font("Helvetica").fontSize(10).fillColor("#0F172A");
    invoice.services.forEach((service, index) => {
      const rowHeight = Math.max(30, doc.heightOfString(getServiceName(service), { width: 286 }) + 14);

      if (y + rowHeight > 690) {
        doc.addPage();
        y = 60;
      }

      doc.roundedRect(48, y - 8, 499, rowHeight, 6).fill(index % 2 === 0 ? "#FFFFFF" : "#F8FAFC");
      doc.fillColor("#0F172A").font("Helvetica").fontSize(10);
      doc.text(String(index + 1), 64, y, { width: 48 });
      doc.text(getServiceName(service), 126, y, { width: 286 });
      doc.text(formatCurrency(service.price), 430, y, { width: 88, align: "right" });
      y += rowHeight;
    });

    y += 18;
    const summaryX = 330;
    doc.roundedRect(summaryX, y, 217, 176, 10).fill("#F8FAFC");
    doc.font("Helvetica").fontSize(10).fillColor("#475569");
    doc.text("Subtotal", summaryX + 18, y + 16, { width: 95 });
    doc.text(formatCurrency(invoice.subtotal), summaryX + 118, y + 16, { width: 72, align: "right" });
    doc.text("Discount", summaryX + 18, y + 40, { width: 95 });
    doc.text(formatCurrency(invoice.discount), summaryX + 118, y + 40, { width: 72, align: "right" });
    doc.text("Total Treatment Cost", summaryX + 18, y + 64, { width: 105 });
    doc.text(formatCurrency(invoice.totalAmount || invoice.total), summaryX + 118, y + 64, { width: 72, align: "right" });
    doc.text("Previous Balance", summaryX + 18, y + 88, { width: 105 });
    doc.text(formatCurrency(invoice.previousBalance), summaryX + 118, y + 88, { width: 72, align: "right" });
    doc.text("Total Paid", summaryX + 18, y + 112, { width: 105 });
    doc.text(formatCurrency(invoice.totalPaid || invoice.amountPaid), summaryX + 118, y + 112, { width: 72, align: "right" });
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#0F172A");
    doc.text("Balance Due", summaryX + 18, y + 140, { width: 95 });
    doc.text(formatCurrency(invoice.balanceDue), summaryX + 118, y + 140, { width: 72, align: "right" });

    doc.font("Helvetica-Bold").fontSize(11).fillColor("#0F172A").text("Amount paid now", 48, y + 16, { width: 170 });
    doc.fontSize(16).fillColor("#1D4ED8").text(formatCurrency(invoice.amountPaid), 48, y + 36, { width: 170 });
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0F172A").text("Payment Status", 48, y + 74, { width: 170 });
    doc.font("Helvetica").fontSize(11).fillColor("#475569").text(invoice.paymentStatus || "Unpaid", 48, y + 92, { width: 170 });
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0F172A").text("Payment Mode", 48, y + 120, { width: 170 });
    doc.font("Helvetica").fontSize(11).fillColor("#475569").text(invoice.paymentMode || "Not specified", 48, y + 138, { width: 170 });

    y += 216;
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#0F172A").text("Payment History / Installments", 48, y, { width: 499 });
    y += 24;
    doc.roundedRect(48, y - 10, 499, 26, 8).fill("#EFF6FF");
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#1E3A8A");
    doc.text("Date", 62, y - 2, { width: 95 });
    doc.text("Payment Mode", 160, y - 2, { width: 110 });
    doc.text("Amount", 280, y - 2, { width: 85, align: "right" });
    doc.text("Note", 382, y - 2, { width: 142 });
    y += 28;
    const payments = invoice.payments?.length ? invoice.payments : [];
    if (payments.length) {
      payments.forEach((payment, index) => {
        if (y > 704) {
          doc.addPage();
          y = 60;
        }

        doc.roundedRect(48, y - 8, 499, 28, 6).fill(index % 2 === 0 ? "#FFFFFF" : "#F8FAFC");
        doc.font("Helvetica").fontSize(9).fillColor("#0F172A");
        doc.text(formatDate(payment.paymentDate), 62, y, { width: 95 });
        doc.text(payment.paymentMode || "-", 160, y, { width: 110 });
        doc.text(formatCurrency(payment.amount), 280, y, { width: 85, align: "right" });
        doc.text(payment.note || "-", 382, y, { width: 142 });
        y += 30;
      });
    } else {
      doc.font("Helvetica").fontSize(9).fillColor("#64748B").text("No payments recorded yet.", 62, y, { width: 462 });
      y += 24;
    }

    y += 20;
    doc.font("Helvetica").fontSize(10).fillColor("#475569").text(
      "Thank you for choosing Params Dental. We wish you a healthy smile.",
      48,
      y,
      { width: 499, align: "center" }
    );

    y += 28;
    doc.font("Helvetica").fontSize(9).fillColor("#64748B").text(
      "This is a digital invoice. No signature is required.",
      48,
      y,
      { width: 499, align: "center" }
    );

    doc.font("Helvetica").fontSize(9).fillColor("#64748B").text(
      "1175, 1st A Main Rd, Hoshalli Extension, Stage 1, Vijayanagar, Bengaluru, Karnataka 560040\nPhone: 8123338324",
      48,
      772,
      { width: 499, align: "center" }
    );

    doc.end();
  });

module.exports = {
  generateInvoicePdf
};
