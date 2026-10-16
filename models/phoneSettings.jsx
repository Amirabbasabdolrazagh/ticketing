import mongoose, { model, models, Schema } from "mongoose";

const phoneSettingsSchema = new Schema({
  key: { type: String, unique: true, default: "default" },
  wssUrl: { type: String, trim: true, maxlength: 300, default: "" },
  sipDomain: { type: String, trim: true, maxlength: 160, default: "" },
  outboundProxy: { type: String, trim: true, maxlength: 300, default: "" },
  companyCallerId: { type: String, trim: true, maxlength: 40, default: "" },
  iceServers: [{
    urls: { type: String, trim: true, maxlength: 300 },
    username: { type: String, trim: true, maxlength: 100, default: "" },
    credentialCiphertext: { type: String, select: false, default: "" },
    credentialIv: { type: String, select: false, default: "" },
    credentialTag: { type: String, select: false, default: "" },
  }],
  recordingEnabled: { type: Boolean, default: true },
  recordingConsentText: { type: String, trim: true, maxlength: 500, default: "این مکالمه با هدف کنترل کیفیت و ثبت سوابق خدمات ضبط می‌شود." },
  retentionDays: { type: Number, min: 1, max: 3650, default: 365 },
  allowHold: { type: Boolean, default: true },
  allowTransfer: { type: Boolean, default: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

const PhoneSettings = models.PhoneSettings || model("PhoneSettings", phoneSettingsSchema);
export default PhoneSettings;
