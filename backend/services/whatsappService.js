const axios = require("axios");
const logger = require("../utils/logger");

const formatIndianPhoneNumber = (phone) => {
  if (!phone) {
    return null;
  }

  let formattedPhone = String(phone).replace(/[\s+\-()]/g, "");

  if (formattedPhone.startsWith("0")) {
    formattedPhone = `91${formattedPhone.slice(1)}`;
  }

  if (/^\d{10}$/.test(formattedPhone)) {
    formattedPhone = `91${formattedPhone}`;
  }

  return formattedPhone;
};

const getWhatsAppApiUrl = () =>
  `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

const sendWhatsAppMessage = async (phone, message) => {
  const formattedPhone = formatIndianPhoneNumber(phone);

  if (!formattedPhone) {
    logger.warn("WhatsApp message skipped because phone number is missing", { phone });
    return { skipped: true };
  }

  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) {
    logger.warn("WhatsApp message skipped because configuration is missing", { phone: formattedPhone });
    return {
      skipped: true
    };
  }

  try {
    const response = await axios.post(
      getWhatsAppApiUrl(),
      {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "text",
        text: {
          preview_url: false,
          body: message
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data;
  } catch (error) {
    logger.error("WhatsApp API error", {
      phone: formattedPhone,
      error,
      response: error.response?.data
    });
    return {
      failed: true,
      error: error.response?.data || error.message
    };
  }
};

const sendInvoiceWhatsApp = async (phone, pdfUrl, patientName, total) => {
  const message = `Hello ${patientName}, your dental clinic invoice of Rs. ${total} is ready. Download it here: ${pdfUrl}`;
  return sendWhatsAppMessage(phone, message);
};

module.exports = {
  formatIndianPhoneNumber,
  sendInvoiceWhatsApp,
  sendWhatsAppMessage
};
