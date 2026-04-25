const mongoose = require("mongoose");

const Inventory = require("../models/Inventory");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getInventoryItems = asyncHandler(async (req, res) => {
  const items = await Inventory.find().sort({ createdAt: -1 });
  return res.status(200).json(successResponse("Inventory retrieved successfully", items));
});

const createInventoryItem = asyncHandler(async (req, res) => {
  const { itemName, quantity, price, supplier, lowStockThreshold } = req.body;

  if (!itemName || quantity === undefined || price === undefined) {
    return res.status(400).json(errorResponse("itemName, quantity, and price are required"));
  }

  const item = await Inventory.create({ itemName, quantity, price, supplier, lowStockThreshold });
  return res.status(201).json(successResponse("Inventory item created successfully", item));
});

const getInventoryItemById = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid inventory item ID"));
  }

  const item = await Inventory.findById(req.params.id);

  if (!item) {
    return res.status(404).json(errorResponse("Inventory item not found"));
  }

  return res.status(200).json(successResponse("Inventory item retrieved successfully", item));
});

const updateInventoryItem = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid inventory item ID"));
  }

  const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!item) {
    return res.status(404).json(errorResponse("Inventory item not found"));
  }

  return res.status(200).json(successResponse("Inventory item updated successfully", item));
});

const deleteInventoryItem = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse("Invalid inventory item ID"));
  }

  const item = await Inventory.findByIdAndDelete(req.params.id);

  if (!item) {
    return res.status(404).json(errorResponse("Inventory item not found"));
  }

  return res.status(200).json(successResponse("Inventory item deleted successfully"));
});

module.exports = {
  getInventoryItems,
  createInventoryItem,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem
};
