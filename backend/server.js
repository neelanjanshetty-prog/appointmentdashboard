const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./utils/db");
const logger = require("./utils/logger");
const requestLogger = require("./middleware/requestLogger");

const analyticsRoutes = require("./routes/analyticsRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const authRoutes = require("./routes/authRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const patientRoutes = require("./routes/patientRoutes");
const whatsappRoutes = require("./routes/whatsappRoutes");

const { startReminderService } = require("./services/reminderService");
const { errorResponse } = require("./utils/apiResponse");

dotenv.config({ path: path.join(__dirname, ".env"), quiet: true });

const app = express();
const PORT = process.env.PORT || 5000;
const DEFAULT_FRONTEND_URL =
  process.env.NODE_ENV === "production" ? "https://admin.paramsdental.com" : "http://localhos:3000";
const allowedOrigins = (process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const loadOptionalRoute = (routePath, serviceName) => {
  try {
    return require(routePath);
  } catch (error) {
    if (error.code === "MODULE_NOT_FOUND" && error.message.toLowerCase().includes(serviceName.toLowerCase())) {
      logger.warn(`${serviceName} route is unavailable`, { error });
      return null;
    }

    throw error;
  }
};

const prescriptionRoutes = loadOptionalRoute("./routes/prescriptionRoutes", "prescription");

// Middleware
app.use(requestLogger);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Root route
app.get("/", (req, res) => {
  res.send("hellooo");
});

// Health route
app.get("/api/health", (req, res) => {
  return res.status(200).json({ status: "ok", service: "appointmentdashboard-backend" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
if (prescriptionRoutes) {
  app.use("/api/prescriptions", prescriptionRoutes);
} else {
  app.use("/api/prescriptions", (req, res) => {
    return res.status(503).json(errorResponse("Prescription service is unavailable on this deployment"));
  });
}
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/analytics", analyticsRoutes);

// 404 handler
app.use((req, res) => {
  return res.status(404).json(errorResponse("Route not found"));
});

// Error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const requestId = req.requestId;

  if (!err.logged) {
    logger.error("Unhandled request error", {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode,
      error: err
    });
  }

  return res.status(statusCode).json(
    errorResponse(
      err.message || "Internal server error",
      process.env.NODE_ENV === "production" ? { requestId } : { requestId, stack: err.stack }
    )
  );
});

// Start server
const startServer = async () => {
  app.listen(PORT,'0.0.0.0', () => {
    logger.info("Server running", {
      port: PORT,
      env: process.env.NODE_ENV || "development",
      allowedOrigins
    });
  });

  try {
    await connectDB();
    startReminderService();
  } catch (error) {
    logger.error("Server started, but database connection failed", { error });
  }
};

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", {
    error: reason instanceof Error ? reason : new Error(String(reason))
  });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error });
  process.exit(1);
});

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
