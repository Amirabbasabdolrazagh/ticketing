import mongoose, { model, models, Schema } from "mongoose";

const onsiteServiceRequestSchema = new Schema({
  requestNumber: { type: String, required: true, unique: true, index: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  serviceType: { type: String, trim: true, maxlength: 100, default: "پشتیبانی فنی حضوری" },
  priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium", index: true },
  address: { type: String, required: true, trim: true, maxlength: 500 },
  onsiteContact: {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 11 },
  },
  equipment: {
    id: { type: mongoose.Schema.Types.ObjectId, default: null },
    name: { type: String, trim: true, maxlength: 100, default: "" },
    serial: { type: String, trim: true, maxlength: 100, default: "" },
  },
  preferredDate: { type: Date, default: null },
  preferredPeriod: { type: String, enum: ["morning", "afternoon", "evening", "flexible"], default: "flexible" },
  assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  scheduledAt: { type: Date, default: null, index: true },
  estimatedDurationMinutes: { type: Number, min: 0, max: 1440, default: 60 },
  status: {
    type: String,
    enum: ["pending_review", "awaiting_schedule", "scheduled", "accepted", "en_route", "arrived", "in_progress", "paused", "awaiting_customer_confirmation", "completed", "cancelled", "revisit_required"],
    default: "pending_review",
    index: true,
  },
  activityTimes: {
    acceptedAt: { type: Date, default: null },
    enRouteAt: { type: Date, default: null },
    arrivedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  workReport: {
    diagnosis: { type: String, trim: true, maxlength: 2000, default: "" },
    actions: { type: String, trim: true, maxlength: 3000, default: "" },
    result: { type: String, trim: true, maxlength: 2000, default: "" },
    parts: { type: String, trim: true, maxlength: 1500, default: "" },
    notes: { type: String, trim: true, maxlength: 2000, default: "" },
    followUpRequired: { type: Boolean, default: false },
    durationMinutes: { type: Number, min: 0, max: 10000, default: 0 },
  },
  customerApproval: {
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    note: { type: String, trim: true, maxlength: 1000, default: "" },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  cancellationReason: { type: String, trim: true, maxlength: 1000, default: "" },
}, { timestamps: true });

const OnsiteServiceRequest = models.OnsiteServiceRequest || model("OnsiteServiceRequest", onsiteServiceRequestSchema);
export default OnsiteServiceRequest;
