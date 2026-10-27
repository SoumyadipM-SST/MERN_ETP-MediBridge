import { z } from "zod";

import { Appointment, Doctor } from "../models/index.js";
import {
  bookAppointment,
  changeAppointment,
} from "../services/appointments.service.js";
import {
  expireWaitingInstant,
  requestInstantConsultation,
} from "../services/instant-consultation.service.js";
import { send } from "../utils/http.js";
import { ensure, id, parse, text } from "../utils/lib.js";

export async function createAppointment(req, res) {
  const body = parse(z.object({ slot: id, reason: text(1000) }).strict(), req.body);
  send(res, await bookAppointment(req.user, body.slot, body.reason), 201);
}
export async function createInstantAppointment(req, res) {
  const body = parse(z.object({ doctor: id }).strict(), req.body);
  send(res, await requestInstantConsultation(req.user, body.doctor), 201);
}

export async function appointments(req, res) {
  await expireWaitingInstant();
  let filter = {};
  if (req.user.role === "patient") filter.patient = req.user._id;
  if (req.user.role === "doctor") {
    const doctor = await Doctor.findOne({ user: req.user._id });
    ensure(doctor, 404, "Doctor profile not found.");
    filter.doctor = doctor._id;
  }
  const appointments = await Appointment.find(filter)
    .sort("-start")
    .limit(200)
    .populate({
      path: "doctor",
      populate: { path: "user", select: "name" },
    })
    .populate("patient", "name");
  send(res, appointments);
}

export async function changeAppointmentStatus(req, res) {
  const body = parse(
    z
      .object({
        status: z.enum(["confirmed", "completed", "cancelled", "missed"]),
      })
      .strict(),
    req.body,
  );
  const appointment = await changeAppointment(
    req.user,
    parse(id, req.params.id),
    body.status,
  );
  send(res, appointment);
}
