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
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    // Legacy fields are kept optional so older survey records remain readable.
    agentRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    processRating: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  },
);

const TicketResolution = models.TicketResolution || model("TicketResolution", ticketResolutionSchema);

export default TicketResolution;
