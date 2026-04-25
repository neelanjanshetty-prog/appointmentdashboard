const nodemailer = require("nodemailer");

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER and EMAIL_PASS are required");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const sendMagicLoginEmail = async (email, loginLink) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"Appointment Dashboard" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your secure dental clinic login link",
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 560px;">
        <h2 style="color: #0f766e;">Sign in to Appointment Dashboard</h2>
        <p>Use the secure link below to sign in to your dental clinic dashboard.</p>
        <p>
          <a href="${loginLink}" style="display: inline-block; background: #0f766e; color: #ffffff; padding: 12px 18px; border-radius: 6px; text-decoration: none; font-weight: 700;">
            Sign in securely
          </a>
        </p>
        <p>This link expires in 10 minutes. If you did not request it, you can ignore this email.</p>
        <p style="font-size: 13px; color: #6b7280;">If the button does not work, paste this link into your browser:<br>${loginLink}</p>
      </div>
    `,
    text: `Sign in to Appointment Dashboard using this secure link: ${loginLink}\n\nThis link expires in 10 minutes.`
  });
};

module.exports = {
  sendMagicLoginEmail
};
