import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";

import { connectDatabase } from "./config/database.js";
import {
  Appointment,
  Doctor,
  Medicine,
  Prescription,
  Session,
  Slot,
  User,
} from "./models/index.js";

dotenv.config({
  path: fileURLToPath(new URL("./.env", import.meta.url)),
  quiet: true,
});
const seedId = (key) =>
  new mongoose.Types.ObjectId(
    createHash("sha256").update(`medibridge:${key}`).digest("hex").slice(0, 24),
  );
const insert = (Model, key, data) =>
  Model.updateOne({ _id: seedId(key) }, { $setOnInsert: data }, { upsert: true });

try {
  await connectDatabase();
  const password = process.env.SEED_PASSWORD;
  if (
    !password ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72 ||
    password === "SET_A_DEMO_PASSWORD"
  )
    throw new Error(
      "Set SEED_PASSWORD in backend/.env to a demonstration password of at least 8 characters and at most 72 UTF-8 bytes.",
    );
  const passwordHash = await bcrypt.hash(password, 12);
  const accounts = [
    ["patient", "Aarav Sharma"],
    ["doctor", "Dr. Rajesh Verma"],
    ["pharmacy", "MediBridge Central Pharmacy"],
  ];
  for (const [role, name] of accounts)
    await User.updateOne(
      { email: `${role}@medibridge.demo` },
      {
        $set: { name },
        $setOnInsert: {
          _id: seedId(role),
          role,
          email: `${role}@medibridge.demo`,
          passwordHash,
          demo: true,
          active: true,
        },
      },
      { upsert: true },
    );
  const patient = await User.findOne({ email: "patient@medibridge.demo" });
  const physician = await User.findOne({ email: "doctor@medibridge.demo" });
  const obsolete = await User.find({
    demo: true,
    role: { $nin: ["patient", "doctor", "pharmacy"] },
  }).select("_id");
  if (obsolete.length) {
    await Session.deleteMany({ user: { $in: obsolete.map((user) => user._id) } });
    await User.deleteMany({ _id: { $in: obsolete.map((user) => user._id) } });
  }
  await Doctor.updateOne(
    { user: physician._id },
    {
      $set: {
        qualification: "MBBS, MD (Internal Medicine)",
        experience: 10,
        bio: "Senior Consultant in General Medicine & Telehealth Care with extensive clinical experience in patient diagnostics and preventive care.",
      },
      $setOnInsert: {
        _id: seedId("doctor-profile"),
        user: physician._id,
        specialty: "General medicine",
        fee: 45000,
        mode: "online",
        active: true,
      },
    },
    { upsert: true },
  );
  const doctor = await Doctor.findOne({ user: physician._id });
  const products = [
    [
      "Sterile gauze roll",
      "First aid",
      16000,
      24,
      false,
      "Roll of 1",
      "first-aid.svg",
      "LOT-GZ-2028",
      "2028-11-30",
    ],
    [
      "Adhesive dressings",
      "First aid",
      9500,
      50,
      false,
      "Pack of 10",
      "first-aid.svg",
      "LOT-AD-2027",
      "2027-12-15",
    ],
    [
      "Digital thermometer",
      "Medical devices",
      32000,
      18,
      false,
      "1 device",
      "device.svg",
      "LOT-DT-2029",
      "2029-06-30",
    ],
    [
      "Hand cleanser",
      "Personal care",
      12500,
      30,
      false,
      "100 ml",
      "care-bottle.svg",
      "LOT-HC-2028",
      "2028-09-20",
    ],
    [
      "Prescription tablet A",
      "Prescription demo",
      24000,
      25,
      true,
      "Pack of 10",
      "rx.svg",
      "LOT-RXA-2027",
      "2027-10-25",
    ],
    [
      "Prescription capsule B",
      "Prescription demo",
      38000,
      20,
      true,
      "Pack of 6",
      "rx.svg",
      "LOT-RXB-2028",
      "2028-04-18",
    ],
    [
      "Support bandage",
      "First aid",
      18000,
      14,
      false,
      "1 bandage",
      "first-aid.svg",
      "LOT-SB-2024 (EXPIRED)",
      "2024-04-12",
    ],
    [
      "Pulse monitor",
      "Medical devices",
      95000,
      12,
      false,
      "1 device",
      "device.svg",
      "LOT-PM-2029",
      "2029-01-15",
    ],
  ];
  for (const [
    index,
    [
      name,
      category,
      price,
      stock,
      requiresPrescription,
      pack,
      image,
      batchLabel,
      expiryDate,
    ],
  ] of products.entries()) {
    await Medicine.updateOne(
      { _id: seedId(`medicine-${index}`) },
      {
        $set: {
          name,
          category,
          price,
          originalPrice: price + 2000,
          stock,
          requiresPrescription,
          pack,
          brand: "MediBridge",
          manufacturer: "Not specified",
          description:
            "Authentic pharmaceutical formulation. Verified composition and quality packaging.",
          image: `/assets/${image}`,
          active: true,
          available: true,
          unavailabilityReason: "",
          batches: [
            {
              batchId: `batch-${index}-${expiryDate}`,
              label: batchLabel,
              expiryDate,
              stock,
            },
          ],
          demo: true,
        },
      },
      { upsert: true },
    );
  }
  const day = new Date().toISOString().slice(0, 10);
  for (let offset = 1; offset <= 3; offset++) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + offset);
    date.setUTCHours(7, 30, 0, 0);
    for (const hours of [0, 2]) {
      const start = new Date(+date + hours * 3600000);
      await insert(Slot, `slot-${start.toISOString()}`, {
        doctor: doctor._id,
        start,
        end: new Date(+start + 1800000),
      });
    }
  }
  const roomStart = new Date(Date.now() + 10 * 60000);
  await insert(Slot, `room-slot-${day}`, {
    doctor: doctor._id,
    start: roomStart,
    end: new Date(+roomStart + 1800000),
    appointment: seedId(`room-${day}`),
  });
  const roomSlot = await Slot.findById(seedId(`room-slot-${day}`));
  await insert(Appointment, `room-${day}`, {
    doctor: doctor._id,
    patient: patient._id,
    slot: roomSlot._id,
    start: roomSlot.start,
    end: roomSlot.end,
    reason: "General health consultation and medical review.",
    fee: doctor.fee,
    status: "confirmed",
  });
  const past = new Date(Date.now() - 7 * 86400000);
  await insert(Slot, "past-slot", {
    doctor: doctor._id,
    start: past,
    end: new Date(+past + 1800000),
    appointment: seedId("past-appointment"),
  });
  await insert(Appointment, "past-appointment", {
    doctor: doctor._id,
    patient: patient._id,
    slot: seedId("past-slot"),
    start: past,
    end: new Date(+past + 1800000),
    fee: doctor.fee,
    reason: "Clinical follow-up consultation",
    status: "completed",
    consultationStatus: "ended",
    notes:
      "Patient is recovering well. Continue prescribed medicines with plenty of fluids.",
  });
  await insert(Prescription, "past-prescription", {
    patient: patient._id,
    doctor: doctor._id,
    appointment: seedId("past-appointment"),
    kind: "digital",
    status: "issued",
    items: [
      {
        medicine: seedId("medicine-4"),
        name: "Prescription tablet A",
        quantity: 1,
        instructions: "Take 1 tablet daily after meals.",
      },
    ],
    instructions:
      "Take with water after food. Complete the full course as recommended.",
    issuedAt: past,
    expiresAt: new Date(+past + 30 * 86400000),
  });
  console.log(
    "Demo seed complete. Existing records and passwords were preserved; no paid orders were fabricated.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
