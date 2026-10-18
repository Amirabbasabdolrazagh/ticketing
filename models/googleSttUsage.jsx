import { model, models, Schema } from "mongoose";

// Reservations are never refunded: a failed or interrupted request cannot
// accidentally cause the same audio to exceed the local free-tier guard.
const googleSttUsageSchema = new Schema({
  _id: { type: String, required: true }, // UTC YYYY-MM; MongoDB enforces uniqueness atomically.
  reservedSeconds: { type: Number, required: true, min: 0, default: 0 },
}, { timestamps: true });

const GoogleSttUsage = models.GoogleSttUsage || model("GoogleSttUsage", googleSttUsageSchema);
export default GoogleSttUsage;
