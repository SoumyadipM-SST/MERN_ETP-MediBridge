import { Doctor, Medicine, Slot } from "../models/index.js";
import { medicineView, stockDate } from "../services/stock.service.js";
import { send } from "../utils/http.js";
import { ensure, id, page, parse, same } from "../utils/lib.js";

export async function categories(_req, res) {
  return send(res, await Medicine.distinct("category", { active: true }));
}

export async function medicines(req, res) {
  const filter = { active: true };
  if (req.query.q) {
    const escaped = String(req.query.q)
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: new RegExp(escaped, "i") },
      { brand: new RegExp(escaped, "i") },
      { keywords: new RegExp(escaped, "i") },
    ];
  }
  if (req.query.category) filter.category = String(req.query.category);
  if (["true", "false"].includes(req.query.rx))
    filter.requiresPrescription = req.query.rx === "true";
  if (req.query.stock === "true") {
    filter.batches = {
      $elemMatch: { stock: { $gt: 0 }, expiryDate: { $gte: stockDate() } },
    };
    filter.available = { $ne: false };
  }
  const sorting = {
    price: { price: 1 },
    "price-desc": { price: -1 },
    name: { name: 1 },
    featured: { _id: 1 },
  }[req.query.sort] || { _id: 1 };
  const { limit, skip } = page(req.query);
  const [items, total] = await Promise.all([
    Medicine.find(filter)
      .select("-availabilityHistory")
      .sort(sorting)
      .skip(skip)
      .limit(limit),
    Medicine.countDocuments(filter),
  ]);
  send(res, {
    items: items.map(medicineView),
    total,
    page: skip / limit + 1,
    pages: Math.ceil(total / limit),
  });
}

export async function medicine(req, res) {
  const product = await Medicine.findOne({
    _id: parse(id, req.params.id),
    active: true,
  }).select("-availabilityHistory");
  ensure(product, 404, "Product not found.");
  send(res, medicineView(product));
}

export async function doctors(req, res) {
  let doctors = await Doctor.find({ active: true }).populate(
    "user",
    "name active role",
  );
  doctors = doctors.filter((d) => d.user?.active && d.user.role === "doctor");
  if (req.query.q)
    doctors = doctors.filter((d) =>
      `${d.user.name} ${d.specialty}`
        .toLowerCase()
        .includes(String(req.query.q).toLowerCase()),
    );
  if (req.query.specialty)
    doctors = doctors.filter((d) => d.specialty === req.query.specialty);
  if (req.query.mode) doctors = doctors.filter((d) => d.mode === req.query.mode);
  const slots = await Slot.find({
    doctor: { $in: doctors.map((d) => d._id) },
    appointment: { $exists: false },
    start: { $gt: new Date() },
  }).sort("start");
  const result = doctors.map((d) => ({
    ...d.toObject(),
    nextSlot: slots.find((s) => same(s.doctor, d._id)) || null,
  }));
  send(
    res,
    req.query.available === "true" ? result.filter((d) => d.nextSlot) : result,
  );
}

export async function doctor(req, res) {
  const doctor = await Doctor.findOne({
    _id: parse(id, req.params.id),
    active: true,
  }).populate("user", "name active role");
  ensure(
    doctor?.user?.active && doctor.user.role === "doctor",
    404,
    "Doctor not found.",
  );
  send(res, {
    ...doctor.toObject(),
    slots: await Slot.find({
      doctor: doctor._id,
      appointment: { $exists: false },
      start: { $gt: new Date() },
    }).sort("start"),
  });
}
