import mongoose from "mongoose";

export const videoSchema = new mongoose.Schema(
  {
    startedAt: Date,
    deadlineAt: Date,
    endedAt: Date,
    durationSeconds: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "ended"] },
    endReason: String,
    accessVersion: { type: Number, default: 0 },
    participants: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        firstAccessAt: Date,
      },
    ],
  },
  { _id: false },
);
