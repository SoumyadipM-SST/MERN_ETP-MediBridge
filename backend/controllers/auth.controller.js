import bcrypt from "bcryptjs";
import { z } from "zod";

import { cookieOptions, loginSession, publicUser } from "../middleware/auth.js";
import { Session, User } from "../models/index.js";
import { send } from "../utils/http.js";
import { ensure, parse, text } from "../utils/lib.js";
import { credentials } from "../utils/validation.js";

export async function register(req, res) {
  const body = parse(credentials.extend({ name: text(100) }), req.body);
  const user = await User.create({
    name: body.name,
    email: body.email,
    passwordHash: await bcrypt.hash(body.password, 12),
    role: "patient",
  });
  await loginSession(res, user);
  send(res, publicUser(user), 201);
}

export async function login(req, res) {
  const body = parse(
    credentials.extend({ role: z.enum(["patient", "doctor", "pharmacy"]) }),
    req.body,
  );
  const user = await User.findOne({
    email: body.email,
    active: true,
    role: body.role,
  }).select("+passwordHash");
  ensure(
    user && (await bcrypt.compare(body.password, user.passwordHash)),
    401,
    "The email, password or selected login role is incorrect.",
  );
  await loginSession(res, user);
  send(res, publicUser(user));
}

export async function me(req, res) {
  return send(res, publicUser(req.user));
}

export async function logout(req, res) {
  await Session.deleteOne({ _id: req.authSession._id });
  res.clearCookie("medibridge", { ...cookieOptions(), maxAge: undefined });
  send(res, { loggedOut: true });
}

export async function updateProfile(req, res) {
  const body = parse(
    z
      .object({
        name: text(100),
        phone: z.string().trim().max(30),
        address: z.string().trim().max(500),
      })
      .strict(),
    req.body,
  );
  Object.assign(req.user, body);
  await req.user.save();
  send(res, publicUser(req.user));
}
