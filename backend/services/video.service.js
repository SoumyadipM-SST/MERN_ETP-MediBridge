import { randomBytes } from "node:crypto";

import { Appointment } from "../models/index.js";
import { ensure, same, transaction } from "../utils/lib.js";
import { expireVideo, videoEligibility } from "./consultation-lifecycle.service.js";
import { expireWaitingInstant } from "./instant-consultation.service.js";

export async function videoAccess(appointment, user) {
  videoEligibility(appointment, user);
  return transaction(async (session) => {
    const current = await Appointment.findById(appointment._id)
      .select("+videoRoomName")
      .populate("doctor")
      .session(session);
    videoEligibility(current, user);
    ensure(
      current.video?.deadlineAt,
      409,
      "Begin this consultation before requesting video access.",
    );
    if (!current.videoRoomName)
      current.videoRoomName = `mb-${randomBytes(24).toString("hex")}`;
    if (!current.video.participants.some((item) => same(item.user, user._id)))
      current.video.participants.push({ user: user._id, firstAccessAt: new Date() });
    current.video.accessVersion += 1;
    await current.save({ session });
    return {
      domain: "meet.jit.si",
      roomName: current.videoRoomName,
      startedAt: current.video.startedAt,
      deadlineAt: current.video.deadlineAt,
      serverNow: new Date().toISOString(),
    };
  });
}

export function startVideoMaintenance() {
  let busy = false;
  const sweep = async () => {
    if (busy) return;
    busy = true;
    try {
      await expireWaitingInstant();
      const due = await Appointment.find({
        "video.status": "active",
        "video.deadlineAt": { $lte: new Date() },
      })
        .select("_id")
        .limit(30);
      for (const appointment of due) await expireVideo(appointment._id);
    } catch {
      console.warn(
        "Consultation status could not be updated. Existing access deadlines remain unchanged.",
      );
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(sweep, 5000);
  timer.unref();
  sweep();
  return () => clearInterval(timer);
}
