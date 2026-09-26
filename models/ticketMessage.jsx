import mongoose, { model, models, Schema } from "mongoose";
const ticketMessageSchema = new Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      maxlength: 5000,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["text", "system"],
      default: "text",
    },
    visibleTo: {
      type: [String],
      enum: ["admin", "agent", "customer"],
      default: ["admin", "agent", "customer"],
    },
  },
  {
    timestamps: true,
  },
);
const TicketMessage =
  models.TicketMessage || model("TicketMessage", ticketMessageSchema);
export default TicketMessage;
