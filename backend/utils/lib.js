import mongoose from "mongoose";
import { z } from "zod";

export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function ensure(condition, status, message) {
  if (!condition) throw new AppError(status, message);
}
export const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid record ID");
export const text = (max = 200) => z.string().trim().min(1).max(max);
export const quantity = z.coerce.number().int().min(1).max(99);
export const parse = (schema, body) => schema.parse(body);
export function page(query) {
  return {
    limit: Math.min(Math.max(Number(query.limit) || 12, 1), 100),
    skip:
      (Math.max(Number(query.page) || 1, 1) - 1) *
      Math.min(Math.max(Number(query.limit) || 12, 1), 100),
  };
}
export async function transaction(fn) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => fn(session));
  } finally {
    await session.endSession();
  }
}
export const same = (a, b) => String(a?._id ?? a) === String(b?._id ?? b);
export function roomWindow(appointment) {
  const now = Date.now();
  ensure(
    !appointment.video?.deadlineAt || +appointment.video.deadlineAt > now,
    410,
    "The five-minute consultation has ended. Rejoining cannot extend it.",
  );
  ensure(
    ["booked", "confirmed"].includes(appointment.status),
    409,
    "This consultation has ended or was cancelled.",
  );
  ensure(
    now >= +appointment.start - 30 * 60000,
    409,
    "The consultation opens 30 minutes before the appointment.",
  );
  ensure(
    now <= +appointment.end + 30 * 60000,
    409,
    "The consultation window has ended.",
  );
}
export function clinicalWrite(appointment) {
  if (appointment.status === "completed") return;
  roomWindow(appointment);
  ensure(
    appointment.consultationStatus === "active",
    409,
    "Open the consultation workspace before editing clinical records.",
  );
}
