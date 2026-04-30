console.log("--- STARTING APP ---");

const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./utils/db");

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

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5001;
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://admin.paramsdental.com",
  "https://paramsdental.com",
  "https://www.paramsdental.com"
];
const configuredOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins])];

const loadOptionalRoute = (routePath, serviceName) => {
  try {
    return require(routePath);
  } catch (error) {
    if (error.code === "MODULE_NOT_FOUND" && error.message.toLowerCase().includes(serviceName.toLowerCase())) {
      console.error(`${serviceName} route is unavailable: ${error.message}`);
      return null;
    }

    throw error;
  }
};

const prescriptionRoutes = loadOptionalRoute("./routes/prescriptionRoutes", "prescription");

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`Blocked by CORS: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    optionsSuccessStatus: 204
  })
);

app.use(
  express.json({
    verify: (req, res, buffer) => {
      req.rawBody = buffer;
    }
  })
);
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
app.use("/api/meta", whatsappRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/analytics", analyticsRoutes);

// 404 handler
app.use((req, res) => {
  return res.status(404).json(errorResponse("Route not found"));
});

// Error handler
app.use((err, req, res, next) => {
  console.error("ERROR:", err);

  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json(
    errorResponse(
      err.message || "Internal server error",
      process.env.NODE_ENV === "production" ? null : err.stack
    )
  );
});

// Start server
let serverInstance = null;

const startServer = async () => {
  if (serverInstance) {
    return serverInstance;
  }

  serverInstance = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  try {
    await connectDB();
    console.log("MongoDB connected");
    startReminderService();
  } catch (error) {
    console.error(`Server started, but database connection failed:\n${error.message}`);
  }

  return serverInstance;
};

startServer();

module.exports = { app, startServer, serverInstance };