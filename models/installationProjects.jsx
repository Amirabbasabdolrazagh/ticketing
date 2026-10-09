import mongoose, { model, models, Schema } from "mongoose";

const installationProjectSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  customerName: { type: String, trim: true, default: "" },
  location: { type: String, trim: true, default: "" },
  description: { type: String, trim: true, default: "" },
  code: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 24 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  passiveAgent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  activeAgent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  status: { type: String, enum: ["planning", "in_progress", "archived"], default: "planning" },
}, { timestamps: true });

const InstallationProject = models.InstallationProject || model("InstallationProject", installationProjectSchema);
export default InstallationProject;
