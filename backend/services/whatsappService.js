const axios = require("axios");

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
  `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || "v19.0"}/${process.env.WHATSAPP_PHONE_ID}/messages`;

const sendWhatsAppMessage = async (phone, message) => {
  const formattedPhone = formatIndianPhoneNumber(phone);

  if (!formattedPhone) {
    console.log("WhatsApp message skipped. Phone number is missing.", { phone, message });
    return { skipped: true };
  }

  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) {
    console.log("WhatsApp message skipped. WHATSAPP_TOKEN or WHATSAPP_PHONE_ID is missing.", {
      phone: formattedPhone,
      message
    });
    return {
      skipped: true,
      reason: "WHATSAPP_TOKEN or WHATSAPP_PHONE_ID is missing"
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
    console.error("WhatsApp API error:", error.response?.data || error.message);
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
