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
