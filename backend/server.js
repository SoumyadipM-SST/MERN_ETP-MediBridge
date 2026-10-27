import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import mongoose from "mongoose";

import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { startVideoMaintenance } from "./services/video.service.js";

dotenv.config({
  path: fileURLToPath(new URL("./.env", import.meta.url)),
  quiet: true,
});
try {
  await connectDatabase();
  const stopVideoMaintenance = startVideoMaintenance();
  const server = createApp().listen(process.env.PORT || 4000, () => {
    console.log(`MediBridge backend: http://127.0.0.1:${process.env.PORT || 4000}`);
  });
  const stop = () => {
    stopVideoMaintenance();
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
} catch (error) {
  console.error(error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
}
