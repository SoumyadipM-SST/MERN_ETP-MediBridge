import { z } from "zod";

import { Message } from "../models/index.js";
import { appointmentFor } from "../services/appointments.service.js";
import {
  beginConsultation,
  expireVideo,
} from "../services/consultation-lifecycle.service.js";
import { saveDigitalPrescription } from "../services/prescriptions.service.js";
import { videoAccess } from "../services/video.service.js";
import { send } from "../utils/http.js";
import { clinicalWrite, ensure, id, parse, roomWindow, text } from "../utils/lib.js";
import { rxFields } from "../utils/validation.js";

export async function consultation(req, res) {
  const appointmentId = parse(id, req.params.id);
  await appointmentFor(req.user, appointmentId);
  await expireVideo(appointmentId);
  const appointment = await appointmentFor(req.user, appointmentId);
  await appointment.populate({
    path: "doctor",
    populate: { path: "user", select: "name" },
  });
  send(res, {
    ...appointment.toObject(),
    canJoin:
      appointment.status === "confirmed" &&
      (appointment.kind !== "instant_test" ||
        appointment.video?.startedAt ||
        (req.user.role === "doctor" &&
          +appointment.instantExpiresAt > Date.now())) &&
      Date.now() >= +appointment.start - 30 * 60000 &&
      Date.now() <= +appointment.end + 30 * 60000,
    videoAvailable: true,
    serverNow: new Date().toISOString(),
  });
}
export async function joinConsultation(req, res) {
  send(res, await beginConsultation(parse(id, req.params.id), req.user));
}
export async function videoAccessForConsultation(req, res) {
  const appointment = await appointmentFor(req.user, parse(id, req.params.id));
  roomWindow(appointment);
  ensure(
    appointment.consultationStatus === "active",
    409,
    "Open the consultation workspace first.",
  );
  res.set("Cache-Control", "no-store");
  send(res, await videoAccess(appointment, req.user));
}
export async function saveNotes(req, res) {
  const body = parse(z.object({ notes: text(10000) }).strict(), req.body);
  const appointment = await appointmentFor(req.user, parse(id, req.params.id));
  clinicalWrite(appointment);
  appointment.notes = body.notes;
  await appointment.save();
  send(res, { saved: true });
}
export async function messages(req, res) {
  const appointment = await appointmentFor(req.user, parse(id, req.params.id));
  send(
    res,
    await Message.find({ appointment: appointment._id })
      .sort("createdAt")
      .limit(200),
  );
}
export async function sendMessage(req, res) {
  const body = parse(z.object({ body: text(2000) }).strict(), req.body);
  const appointment = await appointmentFor(req.user, parse(id, req.params.id));
  roomWindow(appointment);
  ensure(
    appointment.consultationStatus === "active",
    409,
    "Open the consultation workspace before sending a message.",
  );
  send(
    res,
    await Message.create({
      appointment: appointment._id,
      sender: req.user._id,
      role: req.user.role,
      name: req.user.name,
      body: body.body,
    }),
    201,
  );
}
export async function savePrescription(req, res) {
  const body = parse(rxFields, req.body);
  const appointment = await appointmentFor(req.user, parse(id, req.params.id));
  clinicalWrite(appointment);
  send(res, await saveDigitalPrescription(req.user, appointment, body));
}
