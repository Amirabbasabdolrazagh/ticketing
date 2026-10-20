import mongoose, { model, models, Schema } from "mongoose";
const ticketSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      maxlength: 50,
    },
    deadline: {
      type: String,
      default : null,
      maxlength: 500,
    },
    sla: {
      mode: { type: String, enum: ["24x7", "business-hours"], default: undefined },
      priority: { type: String, enum: ["low", "medium", "high"] },
      responseMinutes: Number,
      resolveMinutes: Number,
      startedAt: Date,
      calendar: { type: Schema.Types.Mixed, default: undefined },
      responseDueAt: { type: Date, index: true },
      resolveDueAt: { type: Date, index: true },
    },
    resolvedAt: { type: Date, default: null },
    slaAlerts: {
      responseWarningAt: { type: Date, default: null },
      resolutionWarningAt: { type: Date, default: null },
      responseBreachAt: { type: Date, default: null },
      resolutionBreachAt: { type: Date, default: null },
    },
    deadlineAt: {
      type: Date,
      default: null,
      index: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    source: {
      type: String,
      enum: ["portal", "website"],
      default: "portal",
      index: true,
    },
    guestContact: {
      name: { type: String, trim: true, maxlength: 70 },
      phone: { type: String, trim: true, maxlength: 11 },
    },
    ticketNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedAt: { type: Date, default: null, index: true },
    callbackRequestedAt: { type: Date, default: null, index: true },
    callbackRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastPhoneCallAt: { type: Date, default: null },
    lastPhoneCallBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastCustomerPhoneCallAt: { type: Date, default: null },
    agentViewedAt: { type: Date, default: null },
    agentFirstReplyAt: { type: Date, default: null },
    unseenReminder2hSentAt: { type: Date, default: null },
    unseenAlarm3hSentAt: { type: Date, default: null },
    unseenEscalation4hSentAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved", "closed"],
      default: "open",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
      default: "medium",
    },
    attachment: {
      originalName: { type: String, maxlength: 255 },
      storedName: { type: String, maxlength: 255 },
      mimeType: { type: String, maxlength: 150 },
      size: { type: Number, min: 0 },
    },
  },
  {
    timestamps: true,
  },
);
const Ticket = models.Ticket || model("Ticket", ticketSchema);
export default Ticket;
