import mongoose from "mongoose";

import { videoSchema } from "./video.js";

const { Schema } = mongoose;
const ref = (model, required = true) => ({
  type: Schema.Types.ObjectId,
  ref: model,
  required,
});
const options = { timestamps: true, strict: "throw" };
function model(name, fields, indexes = []) {
  const schema = new Schema(fields, options);
  indexes.forEach(([keys, settings]) => schema.index(keys, settings));
  return mongoose.model(name, schema);
}
export const User = model("User", {
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true, select: false },
  role: {
    type: String,
    enum: ["patient", "doctor", "pharmacy"],
    default: "patient",
  },
  active: { type: Boolean, default: true },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  scheduleVersion: { type: Number, default: 0 },
  demo: { type: Boolean, default: false },
});
export const Session = model(
  "Session",
  {
    user: ref("User"),
    tokenHash: { type: String, unique: true },
    expiresAt: Date,
  },
  [[{ expiresAt: 1 }, { expireAfterSeconds: 0 }]],
);
export const Doctor = model("Doctor", {
  user: { ...ref("User"), unique: true },
  specialty: String,
  qualification: String,
  experience: Number,
  fee: Number,
  bio: String,
  mode: { type: String, enum: ["online", "in-person"], default: "online" },
  active: { type: Boolean, default: true },
  color: String,
});
export const Medicine = model(
  "Medicine",
  {
    name: { type: String, required: true },
    brand: String,
    category: String,
    description: String,
    pack: String,
    manufacturer: String,
    price: { type: Number, required: true, min: 1, validate: Number.isInteger },
    originalPrice: Number,
    stock: { type: Number, required: true, min: 0, validate: Number.isInteger },
    stockVersion: { type: Number, default: 0 },
    batches: [
      {
        _id: false,
        batchId: { type: String, required: true },
        label: { type: String, required: true },
        expiryDate: { type: String, default: null },
        stock: { type: Number, min: 0, required: true, validate: Number.isInteger },
      },
    ],
    requiresPrescription: Boolean,
    active: { type: Boolean, default: true },
    available: { type: Boolean, default: true },
    unavailabilityReason: { type: String, default: "" },
    availabilityHistory: [
      { available: Boolean, reason: String, actor: ref("User"), at: Date },
    ],
    image: String,
    color: String,
    keywords: [String],
    demo: { type: Boolean, default: true },
  },
  [[{ category: 1, active: 1 }, {}]],
);
export const Cart = model("Cart", {
  user: { ...ref("User"), unique: true },
  payment: ref("Payment", false),
  items: [
    {
      _id: false,
      medicine: ref("Medicine"),
      quantity: { type: Number, min: 1, max: 99 },
    },
  ],
});
export const Slot = model(
  "Slot",
  {
    doctor: ref("Doctor"),
    start: Date,
    end: Date,
    appointment: ref("Appointment", false),
  },
  [[{ doctor: 1, start: 1 }, { unique: true }]],
);
export const Appointment = model(
  "Appointment",
  {
    patient: ref("User"),
    doctor: ref("Doctor"),
    slot: ref("Slot"),
    start: Date,
    end: Date,
    reason: String,
    fee: Number,
    kind: {
      type: String,
      enum: ["scheduled", "instant_test"],
      default: "scheduled",
    },
    instantExpiresAt: Date,
    status: {
      type: String,
      enum: ["booked", "confirmed", "completed", "cancelled", "missed"],
      default: "booked",
    },
    notes: { type: String, default: "" },
    videoRoomName: { type: String, select: false, unique: true, sparse: true },
    video: { type: videoSchema, default: undefined },
    consultationStatus: {
      type: String,
      enum: ["waiting", "active", "ended"],
      default: "waiting",
    },
  },
  [
    [{ patient: 1, start: 1 }, {}],
    [{ doctor: 1, start: 1 }, {}],
  ],
);
export const Prescription = model(
  "Prescription",
  {
    patient: ref("User"),
    doctor: ref("Doctor", false),
    appointment: { ...ref("Appointment", false) },
    kind: { type: String, enum: ["digital", "upload"], required: true },
    status: {
      type: String,
      enum: ["draft", "issued", "approved", "rejected"],
      default: "draft",
    },
    items: [
      {
        _id: false,
        medicine: ref("Medicine"),
        name: String,
        quantity: { type: Number, min: 1, max: 99 },
        instructions: String,
      },
    ],
    instructions: String,
    issuedAt: Date,
    expiresAt: Date,
    file: ref("PrivateFile", false),
    order: ref("Order", false),
    reviews: [
      {
        _id: false,
        reviewer: ref("User"),
        decision: String,
        reason: String,
        at: Date,
      },
    ],
  },
  [
    [
      { appointment: 1 },
      {
        unique: true,
        partialFilterExpression: { appointment: { $type: "objectId" } },
      },
    ],
    [{ patient: 1, createdAt: -1 }, {}],
    [{ doctor: 1, createdAt: -1 }, {}],
  ],
);
export const PrivateFile = model("PrivateFile", {
  owner: ref("User"),
  name: String,
  mime: String,
  data: { type: Buffer, select: false },
  size: Number,
});
export const Order = model(
  "Order",
  {
    patient: ref("User"),
    items: [
      {
        _id: false,
        medicine: ref("Medicine"),
        name: String,
        quantity: Number,
        price: Number,
        requiresPrescription: Boolean,
        batches: [
          {
            _id: false,
            batchId: String,
            label: String,
            expiryDate: String,
            quantity: Number,
          },
        ],
      },
    ],
    subtotal: Number,
    shipping: Number,
    total: Number,
    address: String,
    prescription: ref("Prescription", false),
    status: {
      type: String,
      enum: [
        "awaiting_review",
        "confirmed",
        "packed",
        "shipped",
        "delivered",
        "cancelled",
      ],
      required: true,
    },
    payment: ref("Payment", false),
    appointment: ref("Appointment", false),
    idempotencyKey: String,
    history: [
      {
        _id: false,
        status: String,
        at: Date,
        actor: ref("User"),
        reason: String,
      },
    ],
  },
  [
    [{ patient: 1, idempotencyKey: 1 }, { unique: true }],
    [{ patient: 1, createdAt: -1 }, {}],
    [{ createdAt: -1 }, {}],
  ],
);
export const Message = model(
  "Message",
  {
    appointment: ref("Appointment"),
    sender: ref("User"),
    role: String,
    name: String,
    body: String,
  },
  [[{ appointment: 1, createdAt: 1 }, {}]],
);
export const Inventory = model("Inventory", {
  medicine: ref("Medicine"),
  actor: ref("User"),
  delta: Number,
  reason: String,
  batchId: String,
});
export const Payment = model(
  "Payment",
  {
    patient: ref("User"),
    idempotencyKey: String,
    gatewayOrderId: { type: String, unique: true, sparse: true },
    gatewayPaymentId: { type: String, unique: true, sparse: true },
    gatewayRefundId: String,
    refundAttemptAt: Date,
    state: {
      type: String,
      enum: [
        "creating",
        "pending",
        "paid",
        "cancelled",
        "failed",
        "refund_pending",
        "refunded",
      ],
      default: "creating",
    },
    amount: { type: Number, min: 1 },
    currency: { type: String, default: "INR" },
    address: String,
    prescription: ref("Prescription", false),
    items: [
      {
        _id: false,
        medicine: ref("Medicine"),
        name: String,
        quantity: Number,
        price: Number,
        requiresPrescription: Boolean,
      },
    ],
    subtotal: Number,
    shipping: Number,
    order: ref("Order", false),
    message: String,
  },
  [[{ patient: 1, idempotencyKey: 1 }, { unique: true }]],
);
