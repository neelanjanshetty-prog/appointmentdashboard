const Appointment = require("../models/Appointment");
const Inventory = require("../models/Inventory");
const Invoice = require("../models/Invoice");
const Patient = require("../models/Patient");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/apiResponse");
const { normalizeDate } = require("../utils/dateUtils");

const toMap = (rows, key = "_id", value = "count") =>
  rows.reduce((acc, row) => {
    acc[row[key] || "Unknown"] = row[value] || 0;
    return acc;
  }, {});

const percent = (part, total) => (total ? Number(((part / total) * 100).toFixed(2)) : 0);

const getAnalyticsOverview = asyncHandler(async (req, res) => {
  const today = normalizeDate(new Date());

  const [
    totalPatients,
    totalAppointments,
    revenueAgg,
    todayAppointments,
    upcomingFollowUps,
    pendingConfirmations,
    confirmedFollowUps,
    declinedFollowUps,
    missedFollowUps,
    monthlyPatientFlow,
    monthlyRevenue,
    treatmentWiseFollowUps,
    treatmentConfirmations,
    doctorWiseConfirmedFollowUps,
    inventoryValueAgg,
    lowStockItems
  ] = await Promise.all([
    Patient.countDocuments(),
    Appointment.countDocuments(),
    Invoice.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]),
    Appointment.countDocuments({ date: today }),
    Appointment.countDocuments({
      parentAppointmentId: { $ne: null },
      date: { $gte: today },
      status: { $nin: ["cancelled", "declined"] }
    }),
    Appointment.countDocuments({ status: "pending_confirmation", confirmationStatus: "pending" }),
    Appointment.countDocuments({ parentAppointmentId: { $ne: null }, confirmationStatus: "confirmed" }),
    Appointment.countDocuments({ parentAppointmentId: { $ne: null }, confirmationStatus: "declined" }),
    Appointment.countDocuments({
      parentAppointmentId: { $ne: null },
      confirmationStatus: "pending",
      date: { $lt: today }
    }),
    Patient.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Invoice.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          total: { $sum: "$total" }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Appointment.aggregate([
      { $match: { parentAppointmentId: { $ne: null } } },
      { $group: { _id: "$followUpType", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Appointment.aggregate([
      { $match: { parentAppointmentId: { $ne: null } } },
      {
        $group: {
          _id: "$followUpType",
          total: { $sum: 1 },
          confirmed: {
            $sum: {
              $cond: [{ $eq: ["$confirmationStatus", "confirmed"] }, 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Appointment.aggregate([
      { $match: { parentAppointmentId: { $ne: null }, confirmationStatus: "confirmed" } },
      {
        $lookup: {
          from: "doctors",
          localField: "doctorId",
          foreignField: "_id",
          as: "doctor"
        }
      },
      { $unwind: "$doctor" },
      { $group: { _id: "$doctor.name", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Inventory.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ["$quantity", "$price"] } }
        }
      }
    ]),
    Inventory.find({ $expr: { $lte: ["$quantity", "$lowStockThreshold"] } }).sort({ quantity: 1 })
  ]);

  const totalRevenue = revenueAgg[0]?.total || 0;
  const inventoryValue = inventoryValueAgg[0]?.total || 0;
  const totalFollowUps = confirmedFollowUps + declinedFollowUps + pendingConfirmations + missedFollowUps;

  const treatmentWiseConfirmationRate = treatmentConfirmations.map((row) => ({
    treatment: row._id || "Unknown",
    total: row.total,
    confirmed: row.confirmed,
    rate: percent(row.confirmed, row.total)
  }));

  return res.status(200).json(
    successResponse("Analytics overview retrieved successfully", {
      totalPatients,
      totalAppointments,
      totalRevenue,
      todayAppointments,
      upcomingFollowUps,
      pendingConfirmations,
      confirmedFollowUps,
      declinedFollowUps,
      missedFollowUps,
      patientConfirmationRate: percent(confirmedFollowUps, confirmedFollowUps + declinedFollowUps),
      followUpConversionRate: percent(confirmedFollowUps, totalFollowUps),
      monthlyPatientFlow: toMap(monthlyPatientFlow),
      monthlyRevenue: toMap(monthlyRevenue, "_id", "total"),
      treatmentWiseFollowUps: toMap(treatmentWiseFollowUps),
      treatmentWiseConfirmationRate,
      doctorWiseConfirmedFollowUps: toMap(doctorWiseConfirmedFollowUps),
      inventoryValue,
      lowStockItems
    })
  );
});

module.exports = {
  getAnalyticsOverview
};
