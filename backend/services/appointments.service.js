import { Appointment, Doctor, Slot, User } from "../models/index.js";
import { ensure, same, transaction } from "../utils/lib.js";
import { videoEndFields } from "./consultation-lifecycle.service.js";

export async function bookAppointment(user, slotId, reason) {
  return transaction(async (session) => {
    await User.updateOne(
      { _id: user._id },
      { $inc: { scheduleVersion: 1 } },
      { session },
    );
    const slot = await Slot.findOne({
      _id: slotId,
      start: { $gt: new Date() },
      appointment: { $exists: false },
    }).session(session);
    ensure(slot, 409, "This slot is no longer available.");
    const doctor = await Doctor.findOne({
      _id: slot.doctor,
      active: true,
    }).session(session);
    const doctorUser =
      doctor &&
      (await User.findOne({ _id: doctor.user, active: true }).session(session));
    ensure(doctorUser?.role === "doctor", 409, "This doctor is unavailable.");
    await User.updateOne(
      { _id: doctorUser._id },
      { $inc: { scheduleVersion: 1 } },
      { session },
    );
    ensure(
      !(await Appointment.exists({
        doctor: doctor._id,
        status: { $in: ["booked", "confirmed"] },
        start: { $lt: slot.end },
        end: { $gt: slot.start },
      }).session(session)),
      409,
      "This doctor already has a consultation at this time.",
    );
    const overlap = await Appointment.exists({
      patient: user._id,
      status: { $in: ["booked", "confirmed"] },
      start: { $lt: slot.end },
      end: { $gt: slot.start },
    }).session(session);
    ensure(!overlap, 409, "You already have an appointment at this time.");
    const [appointment] = await Appointment.create(
      [
        {
          patient: user._id,
          doctor: doctor._id,
          slot: slot._id,
          start: slot.start,
          end: slot.end,
          reason,
          fee: doctor.fee,
        },
      ],
      { session },
    );
    const reserved = await Slot.updateOne(
      { _id: slot._id, appointment: { $exists: false } },
      { $set: { appointment: appointment._id } },
      { session },
    );
    ensure(
      reserved.modifiedCount,
      409,
      "This slot was just booked. Please choose another.",
    );

    return appointment;
  });
}
export async function appointmentFor(user, appointmentId) {
  const appointment = await Appointment.findById(appointmentId)
    .populate("doctor")
    .populate("patient", "name");
  ensure(appointment, 404, "Appointment not found.");
  ensure(
    (user.role === "patient" && same(appointment.patient, user._id)) ||
      (user.role === "doctor" && same(appointment.doctor.user, user._id)),
    403,
    "This consultation is private.",
  );
  return appointment;
}
export async function changeAppointment(user, appointmentId, status) {
  return transaction(async (session) => {
    const appointment = await Appointment.findById(appointmentId)
      .populate("doctor")
      .session(session);
    ensure(appointment, 404, "Appointment not found.");
    const patient = user.role === "patient" && same(appointment.patient, user._id);
    ensure(
      patient || (user.role === "doctor" && same(appointment.doctor.user, user._id)),
      403,
      "You cannot change this appointment.",
    );
    ensure(
      ["booked", "confirmed"].includes(appointment.status),
      409,
      "This appointment has already ended.",
    );
    if (patient)
      ensure(
        status === "cancelled" &&
          (+appointment.start > Date.now() ||
            (appointment.kind === "instant_test" && !appointment.video?.startedAt)),
        409,
        "Patients can cancel before a scheduled appointment starts, or while an instant test is waiting for its doctor.",
      );
    if (status === "confirmed")
      ensure(
        !patient && appointment.status === "booked",
        409,
        "Only a booked appointment can be confirmed.",
      );
    if (status === "confirmed" && appointment.kind === "instant_test")
      ensure(
        +appointment.instantExpiresAt > Date.now(),
        410,
        "This instant request expired. The patient can request a new test consultation.",
      );
    if (status === "completed")
      ensure(
        !patient && appointment.consultationStatus === "active",
        409,
        "Join the consultation before completing it.",
      );
    if (status === "missed")
      ensure(
        !patient && Date.now() > +appointment.end,
        409,
        "Mark missed only after the appointment ends.",
      );
    appointment.status = status;
    if (["completed", "missed", "cancelled"].includes(status)) {
      appointment.consultationStatus = "ended";
      for (const [path, value] of Object.entries(
        videoEndFields(appointment, status),
      ))
        appointment.set(path, value);
    }
    await appointment.save({ session });
    if (status === "cancelled")
      await Slot.updateOne(
        { _id: appointment.slot, appointment: appointment._id },
        { $unset: { appointment: 1 } },
        { session },
      );

    return appointment;
  });
}
