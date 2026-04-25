const express = require("express");

const {
  getPatients,
  createPatient,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientTimeline
} = require("../controllers/patientController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.route("/").get(getPatients).post(createPatient);
router.get("/:id/timeline", getPatientTimeline);
router.route("/:id").get(getPatientById).put(updatePatient).delete(deletePatient);

module.exports = router;
