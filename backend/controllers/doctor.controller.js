import { z } from "zod";

import { Doctor, Slot, User } from "../models/index.js";
import { send } from "../utils/http.js";
import { ensure, id, parse, text, transaction } from "../utils/lib.js";

export async function doctorProfile(req, res) {
  const profile = await Doctor.findOne({ user: req.user._id }).populate(
    "user",
    "name",
  );
  ensure(profile, 404, "Doctor profile not found.");
  return send(res, profile);
}

export async function updateDoctorProfile(req, res) {
  const body = parse(
    z
      .object({
        bio: text(1500),
        qualification: text(150),
        experience: z.coerce.number().int().min(0).max(60),
        fee: z.coerce.number().int().min(0).max(1000000),
        specialty: text(100),
        mode: z.enum(["online", "in-person"]),
      })
      .strict(),
    req.body,
  );
  const profile = await Doctor.findOneAndUpdate({ user: req.user._id }, body, {
    new: true,
    runValidators: true,
  });
  ensure(profile, 404, "Doctor profile not found.");

  send(res, profile);
}

export async function doctorSlots(req, res) {
  const doctor = await Doctor.findOne({ user: req.user._id });
  ensure(doctor, 404, "Doctor profile not found.");
  send(
    res,
    await Slot.find({
      doctor: doctor._id,
      start: { $gt: new Date() },
    }).sort("start"),
  );
}

export async function createDoctorSlot(req, res) {
  const body = parse(
    z.object({ start: z.iso.datetime({ offset: true }) }).strict(),
    req.body,
  );
  const start = new Date(body.start),
    end = new Date(+start + 30 * 60000);
  ensure(
    +start > Date.now() && +start < Date.now() + 90 * 86400000,
    400,
    "Choose a time within the next 90 days. Slots last 30 minutes.",
  );
  const slot = await transaction(async (session) => {
    await User.updateOne(
      { _id: req.user._id },
      { $inc: { scheduleVersion: 1 } },
      { session },
    );
    const doctor = await Doctor.findOne({ user: req.user._id }).session(session);
    ensure(doctor, 404, "Doctor profile not found.");
    ensure(
      !(await Slot.exists({
        doctor: doctor._id,
        start: { $lt: end },
        end: { $gt: start },
      }).session(session)),
      409,
      "This slot overlaps your availability.",
    );
    const [created] = await Slot.create([{ doctor: doctor._id, start, end }], {
      session,
    });
    return created;
  });
  send(res, slot, 201);
}

export async function removeDoctorSlot(req, res) {
  const doctor = await Doctor.findOne({ user: req.user._id });
  ensure(doctor, 404, "Doctor profile not found.");
  const result = await Slot.deleteOne({
    _id: parse(id, req.params.id),
    doctor: doctor._id,
    appointment: { $exists: false },
  });
  ensure(
    result.deletedCount,
    409,
    "Booked slots cannot be removed. Cancel the appointment first.",
  );
  send(res, { removed: true });
}
