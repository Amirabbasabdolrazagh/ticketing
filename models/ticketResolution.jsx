import mongoose, { model, models, Schema } from "mongoose";

const ticketResolutionSchema = new Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      unique: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isResolved: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const TicketResolution = models.TicketResolution || model("TicketResolution", ticketResolutionSchema);

export default TicketResolution;
