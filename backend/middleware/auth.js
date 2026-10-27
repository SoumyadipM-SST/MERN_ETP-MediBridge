import { createHash, randomBytes } from "node:crypto";

import { Session } from "../models/index.js";
import { ensure } from "../utils/lib.js";

const digest = (token) => createHash("sha256").update(token).digest("hex");
export const cookieOptions = (req) => {
  const isHttps =
    Boolean(req?.secure) ||
    req?.get?.("x-forwarded-proto") === "https" ||
    Boolean(req?.get?.("origin")?.startsWith("https://"));
  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.RENDER === "true" ||
    Boolean(process.env.RENDER_SERVICE_ID) ||
    Boolean(process.env.CLIENT_ORIGIN?.includes("https://")) ||
    isHttps;
  const secure =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === "true" || process.env.COOKIE_SECURE === "1"
      : isProd;
  const sameSite = process.env.COOKIE_SAME_SITE || (secure ? "none" : "lax");
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge: 7 * 24 * 3600 * 1000,
  };
};
export async function loginSession(res, user, req) {
  const token = randomBytes(32).toString("hex");
  await Session.create({
    user: user._id,
    tokenHash: digest(token),
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
  });
  res.cookie("medibridge", token, cookieOptions(req));
}
export async function authenticate(req, _res, next) {
  try {
    const token = req.cookies?.medibridge;
    ensure(token, 401, "Please sign in to continue.");
    const session = await Session.findOne({
      tokenHash: digest(token),
      expiresAt: { $gt: new Date() },
    }).populate("user");
    ensure(
      session?.user?.active &&
        ["patient", "doctor", "pharmacy"].includes(session.user.role),
      401,
      "Your session has expired. Please sign in again.",
    );
    req.user = session.user;
    req.authSession = session;
    next();
  } catch (error) {
    next(error);
  }
}
export const roles =
  (...allowed) =>
  (req, _res, next) => {
    try {
      ensure(
        allowed.includes(req.user.role),
        403,
        "Your role cannot perform this action.",
      );
      next();
    } catch (error) {
      next(error);
    }
  };
export function publicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    active: user.active,
  };
}
