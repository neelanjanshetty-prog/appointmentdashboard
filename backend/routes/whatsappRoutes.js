const express = require("express");

const { receiveWebhook, verifyWebhook } = require("../controllers/whatsappController");

const router = express.Router();

router.get("/webhook", verifyWebhook);
router.post("/webhook", receiveWebhook);

module.exports = router;
