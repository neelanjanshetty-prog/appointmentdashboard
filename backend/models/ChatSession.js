const mongoose = require("mongoose");

const chatSessionSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    step: {
      type: String,
      default: "initial",
      trim: true
    },
    tempData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

module.exports = mongoose.model("ChatSession", chatSessionSchema);
