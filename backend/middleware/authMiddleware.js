const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { errorResponse } = require("../utils/apiResponse");
const logger = require("../utils/logger");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json(errorResponse("Authorization token is required"));
    }

    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is required");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-__v");

    if (!user) {
      return res.status(401).json(errorResponse("Invalid authorization token"));
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      logger.warn("Authorization token validation failed", {
        requestId: req.requestId,
        error
      });
      return res.status(401).json(errorResponse("Invalid or expired authorization token"));
    }

    logger.error("Authentication middleware failed", {
      requestId: req.requestId,
      error
    });
    return next(error);
  }
};

module.exports = {
  protect
};
