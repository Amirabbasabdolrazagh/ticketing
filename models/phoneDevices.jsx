import mongoose, { model, models, Schema } from "mongoose";

const phoneDeviceSchema = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  deviceId: { type: String, required: true, unique: true, index: true },
  label: { type: String, trim: true, maxlength: 80, default: "مرورگر پشتیبان" },
  fingerprint: { type: String, trim: true, maxlength: 180, default: "" },
  status: { type: String, enum: ["pending", "active", "revoked"], default: "pending", index: true },
  sipUsername: { type: String, trim: true, maxlength: 80, default: "" },
  secretCiphertext: { type: String, select: false, default: "" },
  secretIv: { type: String, select: false, default: "" },
  secretTag: { type: String, select: false, default: "" },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  approvedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
  lastSeenAt: { type: Date, default: null, index: true },
  lastRegisteredAt: { type: Date, default: null },
  userAgent: { type: String, trim: true, maxlength: 300, default: "" },
  ipHash: { type: String, trim: true, maxlength: 128, default: "" },
}, { timestamps: true });

phoneDeviceSchema.index({ user: 1, status: 1 });

const PhoneDevice = models.PhoneDevice || model("PhoneDevice", phoneDeviceSchema);
export default PhoneDevice;
