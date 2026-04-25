const express = require("express");

const {
  getAppointments,
  createAppointment,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
  createFollowUpAppointment
} = require("../controllers/appointmentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.route("/").get(getAppointments).post(createAppointment);
router.post("/:id/follow-up", createFollowUpAppointment);
router.route("/:id").get(getAppointmentById).put(updateAppointment).delete(deleteAppointment);

module.exports = router;
