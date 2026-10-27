import { Appointment, Medicine, Prescription } from "../models/index.js";
import { ensure, transaction } from "../utils/lib.js";

export async function saveDigitalPrescription(user, appointment, body) {
  return await transaction(async (session) => {
    const locked = await Appointment.findOneAndUpdate(
      {
        _id: appointment._id,
        status: { $in: ["booked", "confirmed", "completed"] },
        $or: [{ status: "completed" }, { consultationStatus: "active" }],
      },
      { $set: { updatedAt: new Date() } },
      { new: true, session },
    );
    ensure(
      locked,
      409,
      "Join an active consultation before writing a prescription.",
    );
    const existing = await Prescription.findOne({
      appointment: appointment._id,
    }).session(session);
    ensure(
      !existing || existing.status === "draft",
      409,
      "An issued prescription cannot be changed.",
    );
    ensure(
      new Set(body.items.map((i) => i.medicine)).size === body.items.length,
      400,
      "Select each product only once.",
    );
    const items = [];
    for (const item of body.items) {
      const medicine = await Medicine.findOne({
        _id: item.medicine,
        active: true,
      }).session(session);
      ensure(medicine, 400, "Select an active catalog product.");
      items.push({ ...item, name: medicine.name });
    }
    const data = {
      patient: appointment.patient._id,
      doctor: appointment.doctor._id,
      appointment: appointment._id,
      kind: "digital",
      items,
      instructions: body.instructions,
      status: body.issue ? "issued" : "draft",
      ...(body.issue
        ? {
            issuedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 86400000),
          }
        : {}),
    };
    const record = existing ? Object.assign(existing, data) : new Prescription(data);
    await record.save({ session });

    return record;
  });
}
