import { Appointment } from "../models/index.js";
import { ensure, roomWindow, same, transaction } from "../utils/lib.js";

export const VIDEO_SECONDS = 300;

export function videoEligibility(appointment, user) {
  ensure(appointment, 404, "Appointment not found.");
  ensure(
    (user.role === "patient" && same(appointment.patient, user._id)) ||
      (user.role === "doctor" && same(appointment.doctor?.user, user._id)),
    403,
    "Only the assigned patient and doctor can access this consultation.",
  );
  ensure(
    !appointment.video?.endedAt,
    410,
    "This consultation has ended. Rejoining cannot extend it.",
  );
  roomWindow(appointment);
  ensure(
    appointment.status === "confirmed",
    409,
    "The assigned doctor must confirm this appointment first.",
  );
  ensure(
    appointment.doctor?.active !== false && appointment.doctor?.mode !== "in-person",
    409,
    "This appointment is not available for online consultation.",
  );
  ensure(
    appointment.consultationStatus === "active",
    409,
    "Begin the consultation before joining video.",
  );
}

export async function beginConsultation(appointmentId, user) {
  return transaction(async (session) => {
    const appointment = await Appointment.findById(appointmentId)
      .populate("doctor")
      .session(session);
    ensure(appointment, 404, "Appointment not found.");
    if (appointment.kind === "instant_test" && !appointment.video?.startedAt) {
      ensure(
        +appointment.instantExpiresAt > Date.now(),
        410,
        "This test request expired while waiting. Request again when both participants are ready.",
      );
      ensure(
        user.role === "doctor" && same(appointment.doctor?.user, user._id),
        409,
        "Waiting for the assigned doctor to accept and begin the test consultation.",
      );
    }
    appointment.consultationStatus = "active";
    videoEligibility(appointment, user);
    if (!appointment.video?.startedAt) {
      const now = Math.floor(Date.now() / 1000) * 1000;
      appointment.video = {
        startedAt: new Date(now),
        deadlineAt: new Date(
          Math.min(now + VIDEO_SECONDS * 1000, +appointment.end + 30 * 60000),
        ),
        status: "active",
        participants: [],
      };
    }
    appointment.video.accessVersion += 1;
    await appointment.save({ session });
    return appointment;
  });
}

export function videoEndFields(appointment, reason, now = Date.now()) {
  if (!appointment.video?.startedAt || appointment.video.endedAt) return {};
  const end = Math.min(now, +appointment.video.deadlineAt);
  return {
    "video.status": "ended",
    "video.endedAt": new Date(end),
    "video.durationSeconds": Math.max(
      0,
      Math.floor((end - +appointment.video.startedAt) / 1000),
    ),
    "video.endReason": reason,
  };
}

export async function expireVideo(appointmentId) {
  const appointment = await Appointment.findById(appointmentId);
  if (
    !appointment?.video?.deadlineAt ||
    appointment.video.endedAt ||
    +appointment.video.deadlineAt > Date.now()
  )
    return appointment;
  return Appointment.findOneAndUpdate(
    {
      _id: appointmentId,
      "video.endedAt": { $exists: false },
      "video.deadlineAt": { $lte: new Date() },
    },
    {
      $set: {
        ...videoEndFields(appointment, "five-minute limit"),
        status: "completed",
        consultationStatus: "ended",
      },
    },
    { new: true },
  );
}
