const mongoose = require("mongoose");

const invoiceServiceSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    _id: false
  }
);

const paymentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMode: {
      type: String,
      trim: true
    },
    paymentDate: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      trim: true
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    _id: false
  }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNo: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    patientName: {
      type: String,
      required: true,
      trim: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient"
    },
    patientPhone: {
      type: String,
      required: true,
      trim: true
    },
    services: {
      type: [invoiceServiceSchema],
      required: true,
      default: []
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    totalAmount: {
      type: Number,
      min: 0
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0
    },
    previousBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0
    },
    balanceDue: {
      type: Number,
      default: 0,
      min: 0
    },
    advancePaid: {
      type: Number,
      default: 0,
      min: 0
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Partially Paid", "Unpaid"],
      default: "Unpaid"
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMode: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    payments: {
      type: [paymentSchema],
      default: []
    },
    pdfPath: {
      type: String,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
