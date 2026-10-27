import { existsSync } from "node:fs"
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import { ZodError } from "zod";

import { configureApp } from "./config/http.js";
import { authenticate } from "./middleware/auth.js";
import { registerAuthRoutes } from "./routes/auth.routes.js";
import { registerCatalogRoutes } from "./routes/catalog.routes.js";
import { registerClinicalRoutes } from "./routes/clinical.routes.js";
import { registerCommerceRoutes } from "./routes/commerce.routes.js";
import { registerOperationsRoutes } from "./routes/operations.routes.js";
import { send } from "./utils/http.js";
import { AppError } from "./utils/lib.js";

function createApp() {
  const app = express();
  configureApp(app);
  app.get("/api/health", (_req, res) =>
    send(
      res,
      {
        status: mongoose.connection.readyState === 1 ? "ok" : "unavailable",
        database: mongoose.connection.readyState === 1,
      },
      mongoose.connection.readyState === 1 ? 200 : 503,
    ),
  );
  registerAuthRoutes(app);
  registerCatalogRoutes(app);
  app.use("/api", authenticate);
  registerClinicalRoutes(app);
  registerCommerceRoutes(app);
  registerOperationsRoutes(app);
  app.use("/api", (_req, _res, next) =>
    next(new AppError(404, "API endpoint not found.")),
  );
  const frontend = resolve(
    fileURLToPath(new URL("../frontend/dist", import.meta.url)),
  );
  if (existsSync(frontend)) {
    app.use(express.static(frontend));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(resolve(frontend, "index.html")),
    );
  }
  app.use((error, _req, res, _next) => {
    let status = error.status || 500,
      message =
        error instanceof AppError || status < 500
          ? error.message
          : "Something went wrong. Please try again.";
    if (error instanceof ZodError) {
      status = 400;
      message = error.issues
        .map((i) => `${i.path.join(".") || "Input"}: ${i.message}`)
        .join("; ");
    }
    if (error.code === 11000) {
      status = 409;
      message = "That record already exists or this slot was just taken.";
    }
    if (error.name === "CastError") {
      status = 400;
      message = "Invalid record ID.";
    }
    if (error instanceof multer.MulterError) {
      status = 400;
      message =
        error.code === "LIMIT_FILE_SIZE"
          ? "File is too large. Maximum size is 5 MB."
          : "Upload one PDF, PNG, or JPEG file.";
    }
    if (error.type === "entity.parse.failed") {
      status = 400;
      message = "Invalid JSON request.";
    }
    if (status >= 500 && process.env.NODE_ENV !== "test")
      console.error("API error:", error.name, error.code || "", "status", status);
    res.status(status).json({ error: { message } });
  });
  return app;
}
export { createApp };
