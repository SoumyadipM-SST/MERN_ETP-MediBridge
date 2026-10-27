import { Appointment, Doctor, Slot, User } from "../models/index.js";
import { ensure, transaction } from "../utils/lib.js";
import { expireVideo } from "./consultation-lifecycle.service.js";

export async function expireWaitingInstant() {
  const filter = {
    kind: "instant_test",
    status: { $in: ["booked", "confirmed"] },
    instantExpiresAt: { $lte: new Date() },
    "video.startedAt": { $exists: false },
  };
  const due = await Appointment.find(filter).select("_id").limit(50);
  if (!due.length) return;
  const ids = due.map((item) => item._id);
  await transaction(async (session) => {
    const expired = await Appointment.find({ ...filter, _id: { $in: ids } }).session(
      session,
    );
    const expiredIds = expired.map((item) => item._id);
    await Appointment.updateMany(
      { _id: { $in: expiredIds } },
      { $set: { status: "cancelled", consultationStatus: "ended" } },
      { session },
    );
    await Slot.updateMany(
      { appointment: { $in: expiredIds } },
      { $unset: { appointment: 1 } },
      { session },
    );
  });
}

export async function requestInstantConsultation(user, doctorId) {
  ensure(
    user.role === "patient",
    403,
    "Only patients can request an instant test consultation.",
  );
  await expireWaitingInstant();
  const previous = await Appointment.findOne({
    patient: user._id,
    kind: "instant_test",
    status: { $in: ["booked", "confirmed"] },
  });
  if (previous?.video?.deadlineAt) await expireVideo(previous._id);
  return transaction(async (session) => {
    await User.updateOne(
      { _id: user._id },
      { $inc: { scheduleVersion: 1 } },
      { session },
    );
    const existing = await Appointment.findOne({
      patient: user._id,
      kind: "instant_test",
      status: { $in: ["booked", "confirmed"] },
    }).session(session);
    if (existing) return existing;
    const doctor = await Doctor.findOne({
      _id: doctorId,
      active: true,
      mode: "online",
    }).session(session);
    ensure(
      doctor,
      409,
      "No eligible online doctor is available for that request. Choose another doctor or use scheduled booking.",
    );
    const doctorUser = await User.findOneAndUpdate(
      { _id: doctor.user, active: true, role: "doctor" },
      { $inc: { scheduleVersion: 1 } },
      { new: true, session },
    );
    ensure(doctorUser, 409, "That doctor is unavailable. No test room was created.");
    const start = new Date(),
      end = new Date(+start + 10 * 60000);
    const overlap = {
      status: { $in: ["booked", "confirmed"] },
      start: { $lt: end },
      end: { $gt: start },
    };
    ensure(
      !(await Appointment.exists({ ...overlap, patient: user._id }).session(
        session,
      )),
      409,
      "You already have a consultation in this time window. Open it or cancel it first.",
    );
    ensure(
      !(await Appointment.exists({ ...overlap, doctor: doctor._id }).session(
        session,
      )),
      409,
      "This doctor is busy. Choose another doctor or return to scheduled booking. No test room was created.",
    );
    const [slot] = await Slot.create([{ doctor: doctor._id, start, end }], {
      session,
    });
    const [appointment] = await Appointment.create(
      [
        {
          patient: user._id,
          doctor: doctor._id,
          slot: slot._id,
          start,
          end,
          kind: "instant_test",
          instantExpiresAt: new Date(+start + 5 * 60000),
          fee: 0,
          reason: "Instant Consultation (Test Only)",
          status: "booked",
        },
      ],
      { session },
    );
    slot.appointment = appointment._id;
    await slot.save({ session });
    return appointment;
  });
}
