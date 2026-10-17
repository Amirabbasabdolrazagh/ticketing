import mongoose, { model, models, Schema } from "mongoose";

const phoneCallSchema = new Schema({
  callId: { type: String, required: true, unique: true, index: true },
  sipCallId: { type: String, trim: true, maxlength: 150, default: "", index: true },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", default: null, index: true },
  device: { type: mongoose.Schema.Types.ObjectId, ref: "PhoneDevice", default: null },
  direction: { type: String, enum: ["outbound", "inbound", "internal"], required: true, index: true },
  status: { type: String, enum: ["initiated", "ringing", "answered", "completed", "missed", "failed", "rejected"], default: "initiated", index: true },
  startedAt: { type: Date, default: Date.now, index: true },
  answeredAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  durationSeconds: { type: Number, min: 0, default: 0 },
  customerDisplayName: { type: String, trim: true, maxlength: 120, default: "مشتری" },
  maskedTarget: { type: String, trim: true, maxlength: 40, default: "شماره محرمانه" },
  recording: {
    storedName: { type: String, trim: true, maxlength: 255, default: "" },
    mimeType: { type: String, trim: true, maxlength: 100, default: "" },
    size: { type: Number, min: 0, default: 0 },
    uploadedAt: { type: Date, default: null },
  },
  transcript: { type: String, trim: true, maxlength: 250000, default: "" },
  transcription: {
    status: { type: String, enum: ["not_requested", "pending", "processing", "completed", "failed"], default: "not_requested", index: true },
    segments: [{ start: { type: Number, min: 0 }, end: { type: Number, min: 0 }, text: { type: String, trim: true, maxlength: 10000 } }],
    language: { type: String, trim: true, maxlength: 20, default: "fa" },
    engine: { type: String, trim: true, maxlength: 100, default: "" },
    error: { type: String, trim: true, maxlength: 500, default: "" },
    completedAt: { type: Date, default: null },
  },
  analysis: {
    summary: { type: String, trim: true, maxlength: 12000, default: "" },
    issue: { type: String, trim: true, maxlength: 5000, default: "" },
    customerRequests: { type: String, trim: true, maxlength: 5000, default: "" },
    agentActions: { type: String, trim: true, maxlength: 5000, default: "" },
    resolution: { type: String, trim: true, maxlength: 5000, default: "" },
    outcome: { type: String, enum: ["unknown", "resolved", "follow_up", "unresolved"], default: "unknown" },
    satisfactionEvidence: { type: String, trim: true, maxlength: 3000, default: "" },
    followUp: { type: String, trim: true, maxlength: 5000, default: "" },
    model: { type: String, trim: true, maxlength: 120, default: "" },
    generatedAt: { type: Date, default: null },
  },
  report: {
    issue: { type: String, trim: true, maxlength: 3000, default: "" },
    customerRequests: { type: String, trim: true, maxlength: 3000, default: "" },
    actions: { type: String, trim: true, maxlength: 3000, default: "" },
    result: { type: String, trim: true, maxlength: 3000, default: "" },
    outcome: { type: String, enum: ["unknown", "resolved", "follow_up", "unresolved"], default: "unknown" },
    satisfaction: { type: Number, min: 1, max: 5, default: null },
    notes: { type: String, trim: true, maxlength: 3000, default: "" },
    completedAt: { type: Date, default: null },
  },
}, { timestamps: true });

phoneCallSchema.index({ agent: 1, startedAt: -1 });
phoneCallSchema.index({ ticket: 1, startedAt: -1 });

const PhoneCall = models.PhoneCall || model("PhoneCall", phoneCallSchema);
export default PhoneCall;
