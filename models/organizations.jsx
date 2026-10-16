import mongoose, { model, models, Schema } from "mongoose";

const equipmentSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  type: { type: String, trim: true, maxlength: 80, default: "" },
  serial: { type: String, trim: true, maxlength: 100, default: "" },
  status: { type: String, enum: ["active", "repair", "retired"], default: "active" },
}, { _id: true });

const organizationSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  code: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 24 },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  supportContract: {
    title: { type: String, trim: true, maxlength: 120, default: "قرارداد پشتیبانی" },
    level: { type: String, enum: ["basic", "standard", "premium"], default: "standard" },
    status: { type: String, enum: ["active", "expiring", "expired", "draft"], default: "active" },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
    features: {
      onsiteService: { type: Boolean, default: false },
      secureCall: { type: Boolean, default: false },
      remoteSupport: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
    },
  },
  equipment: [equipmentSchema],
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

const Organization = models.Organization || model("Organization", organizationSchema);
export default Organization;
