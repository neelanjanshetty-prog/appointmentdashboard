const jwt = require("jsonwebtoken");

const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const { sendMagicLoginEmail } = require("../services/emailService");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }

  return process.env.JWT_SECRET;
};

const normalizeEmail = (email) => email.trim().toLowerCase();

const sendMagicLink = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== "string" || !emailRegex.test(email)) {
    return res.status(400).json(errorResponse("A valid email is required"));
  }

  const normalizedEmail = normalizeEmail(email);
  await User.findOneAndUpdate(
    { email: normalizedEmail },
    { $setOnInsert: { email: normalizedEmail } },
    { upsert: true, new: true }
  );

  const token = jwt.sign(
    {
      email: normalizedEmail,
      purpose: "magic_login"
    },
    getJwtSecret(),
    { expiresIn: "10m" }
  );

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const loginLink = `${frontendUrl.replace(/\/$/, "")}/verify?token=${encodeURIComponent(token)}`;

  await sendMagicLoginEmail(normalizedEmail, loginLink);

  return res.status(200).json(successResponse("Magic login link sent successfully"));
});

const verifyMagicLink = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return res.status(400).json(errorResponse("Token is required"));
  }

  let decoded;

  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch (error) {
    return res.status(401).json(errorResponse("Invalid or expired token"));
  }

  if (decoded.purpose !== "magic_login" || !decoded.email) {
    return res.status(401).json(errorResponse("Invalid token"));
  }

  const email = normalizeEmail(decoded.email);
  const user = await User.findOneAndUpdate(
    { email },
    { $setOnInsert: { email } },
    { upsert: true, new: true }
  );

  const loginToken = jwt.sign(
    {
      id: user._id.toString(),
      email: user.email
    },
    getJwtSecret(),
    { expiresIn: "7d" }
  );

  return res.status(200).json(
    successResponse("Login successful", {
      token: loginToken,
      user: {
        id: user._id,
        email: user.email
      }
    })
  );
});

module.exports = {
  sendMagicLink,
  verifyMagicLink
};
