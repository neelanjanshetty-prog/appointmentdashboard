const express = require("express");

const { sendMagicLink, verifyMagicLink } = require("../controllers/authController");

const router = express.Router();

router.post("/send-link", sendMagicLink);
router.get("/verify", verifyMagicLink);

module.exports = router;
