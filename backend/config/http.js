import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";

import { AppError } from "../utils/lib.js";

function configureApp(app) {
  const origins = (process.env.CLIENT_ORIGIN || "http://127.0.0.1:5173")
    .split(",")
    .map((origin) => {
      let o = origin.trim().replace(/\/+$/, "");
      if (o && !/^https?:\/\//i.test(o)) {
        o = `https://${o}`;
      }
      return o.toLowerCase();
    })
    .filter(Boolean);
  app.disable("x-powered-by");

  const trustProxy = process.env.TRUST_PROXY;
  if (
    trustProxy === "1" ||
    (trustProxy !== "0" && process.env.NODE_ENV === "production")
  ) {
    app.set("trust proxy", 1);
  }

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "https://checkout.razorpay.com",
            "https://meet.jit.si",
          ],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https://*.razorpay.com"],
          connectSrc: ["'self'", ...origins, "https://*.razorpay.com"],
          fontSrc: ["'self'"],
          frameSrc: ["'self'", "https://meet.jit.si", "https://*.razorpay.com"],
          objectSrc: ["'none'"],
        },
      },
    }),
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const normalized = origin.trim().replace(/\/+$/, "").toLowerCase();
        if (origins.includes(normalized)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "10mb" }), cookieParser());
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 300,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.use("/api", (req, _res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.get("origin");
      const normalized = origin
        ? origin.trim().replace(/\/+$/, "").toLowerCase()
        : null;
      if (
        (normalized && !origins.includes(normalized)) ||
        req.get("x-medibridge") !== "1"
      )
        return next(
          new AppError(
            403,
            "Request origin could not be verified. Refresh the application.",
          ),
        );
    }
    next();
  });
}
export { configureApp };
