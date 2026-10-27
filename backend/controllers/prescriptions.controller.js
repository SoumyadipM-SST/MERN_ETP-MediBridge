import {
  Cart,
  Doctor,
  Medicine,
  Prescription,
  PrivateFile,
} from "../models/index.js";
import { appointmentFor } from "../services/appointments.service.js";
import { cartView, orderable } from "../services/commerce.service.js";
import { send } from "../utils/http.js";
import {
  clinicalWrite,
  ensure,
  id,
  parse,
  same,
  transaction,
} from "../utils/lib.js";

export async function prescriptions(req, res) {
  let filter = { patient: req.user._id, status: { $ne: "draft" } };
  if (req.user.role === "doctor") {
    const profile = await Doctor.findOne({ user: req.user._id });
    ensure(profile, 404, "Doctor profile not found.");
    filter = { doctor: profile._id };
  }
  send(
    res,
    await Prescription.find(filter)
      .sort("-createdAt")
      .limit(100)
      .populate({ path: "doctor", populate: { path: "user", select: "name" } }),
  );
}
function allowedPrescription(user, rx) {
  return (
    (user.role === "patient" &&
      same(rx.patient, user._id) &&
      rx.status !== "draft") ||
    (user.role === "doctor" && same(rx.doctor?.user, user._id)) ||
    (user.role === "pharmacy" && Boolean(rx.order))
  );
}
export async function prescription(req, res) {
  const rx = await Prescription.findById(parse(id, req.params.id)).populate(
    "doctor",
  );
  ensure(rx, 404, "Prescription not found.");
  ensure(allowedPrescription(req.user, rx), 403, "This prescription is private.");
  send(res, rx);
}
function validFile(file) {
  ensure(file, 400, "Choose a PDF, PNG or JPEG file, up to 5 MB.");
  const b = file.buffer;
  const detected =
    b.subarray(0, 5).toString() === "%PDF-"
      ? "application/pdf"
      : b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? "image/png"
        : b[0] === 255 && b[1] === 216 && b[2] === 255
          ? "image/jpeg"
          : null;
  ensure(
    detected && detected === file.mimetype,
    400,
    "File contents must match PDF, PNG or JPEG format.",
  );
  return detected;
}
export async function uploadPrescription(req, res) {
  const mime = validFile(req.file);
  let appointment;
  if (req.user.role === "doctor") {
    appointment = await appointmentFor(req.user, parse(id, req.params.id));
    clinicalWrite(appointment);
    ensure(
      appointment.status === "completed" ||
        appointment.consultationStatus === "active",
      409,
      "Start or complete this consultation before uploading its prescription.",
    );
    ensure(
      !["cancelled", "missed"].includes(appointment.status),
      409,
      "This consultation cannot receive a prescription.",
    );
  }
  const owner = appointment?.patient._id || req.user._id;
  const rx = await transaction(async (session) => {
    const existing = appointment
      ? await Prescription.findOne({ appointment: appointment._id }).session(session)
      : null;
    ensure(
      !existing || existing.status === "draft",
      409,
      "An issued prescription cannot be replaced.",
    );
    const [file] = await PrivateFile.create(
      [
        {
          owner,
          name:
            req.file.originalname.replace(/[^\w. -]/g, "").slice(0, 100) ||
            "prescription",
          mime,
          data: req.file.buffer,
          size: req.file.size,
        },
      ],
      { session },
    );
    const record = existing || new Prescription();
    Object.assign(record, {
      patient: owner,
      doctor: appointment?.doctor._id,
      appointment: appointment?._id,
      kind: "upload",
      status: "issued",
      file: file._id,
      items: [],
      instructions:
        "Uploaded document. Pharmacy review is required before restricted medicines are fulfilled.",
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    });
    await record.save({ session });
    return record;
  });
  send(res, rx, 201);
}
export async function downloadFile(req, res) {
  const file = await PrivateFile.findById(parse(id, req.params.id)).select("+data");
  ensure(file, 404, "File not found.");
  const rx = await Prescription.findOne({ file: file._id }).populate("doctor");
  ensure(rx && allowedPrescription(req.user, rx), 403, "This document is private.");
  res
    .set({
      "Content-Type": file.mime,
      "Content-Disposition": `attachment; filename="${file.name}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    })
    .send(file.data);
}
export async function prescriptionCart(req, res) {
  const result = await transaction(async (session) => {
    const rx = await Prescription.findOne({
      _id: parse(id, req.params.id),
      patient: req.user._id,
      kind: "digital",
      status: { $in: ["issued", "approved"] },
      expiresAt: { $gt: new Date() },
      order: { $exists: false },
    }).session(session);
    ensure(rx, 409, "This prescription is expired, already used or unavailable.");
    const cart = await Cart.findOne({ user: req.user._id }).session(session);
    ensure(
      !cart?.payment,
      409,
      "Close or finish the pending checkout before replacing your cart.",
    );
    const products = await Medicine.find({
      _id: { $in: rx.items.map((item) => item.medicine) },
    }).session(session);
    for (const item of rx.items)
      ensure(
        orderable(
          products.find((product) => same(product._id, item.medicine)),
          item.quantity,
        ),
        409,
        `${item.name} is unavailable. No substitution was made.`,
      );
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: {
          items: rx.items.map((item) => ({
            medicine: item.medicine,
            quantity: item.quantity,
          })),
        },
      },
      { upsert: true, session },
    );
    return rx;
  });
  send(res, { prescription: result._id, cart: await cartView(req.user._id) });
}
