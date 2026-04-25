const express = require("express");

const {
  getInventoryItems,
  createInventoryItem,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem
} = require("../controllers/inventoryController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.route("/").get(getInventoryItems).post(createInventoryItem);
router.route("/:id").get(getInventoryItemById).put(updateInventoryItem).delete(deleteInventoryItem);

module.exports = router;
