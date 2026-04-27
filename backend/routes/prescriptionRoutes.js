const express = require("express");

const {
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
  updatePrescription,
  deletePrescription,
  getPrescriptionsByPatient,
  getPrescriptionsByAppointment
} = require("../controllers/prescriptionController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.route("/").get(getPrescriptions).post(createPrescription);
router.get("/patient/:patientId", getPrescriptionsByPatient);
router.get("/appointment/:appointmentId", getPrescriptionsByAppointment);
router.route("/:id").get(getPrescriptionById).put(updatePrescription).delete(deletePrescription);

module.exports = router;
