import mongoose, { model, models, Schema } from "mongoose";

const remoteSupportSessionSchema = new Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    endedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["requested", "approved", "declined", "ended", "expired"],
      default: "requested",
      index: true,
    },
    requestNote: { type: String, trim: true, maxlength: 1000, default: "" },
    requestedAt: { type: Date, default: Date.now },
    customerApprovedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

remoteSupportSessionSchema.index({ ticket: 1, createdAt: -1 });

const RemoteSupportSession =
  models.RemoteSupportSession ||
  model("RemoteSupportSession", remoteSupportSessionSchema);

export default RemoteSupportSession;
