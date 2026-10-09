import mongoose, { Schema, model, models } from "mongoose";
const schema = new Schema({ project: { type: mongoose.Schema.Types.ObjectId, ref: "InstallationProject", required: true, index: true }, assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, assigneeRole: { type: String, enum: ["passive_agent", "active_agent"], required: true }, status: { type: String, enum: ["assigned", "submitted", "approved", "rejected"], default: "assigned" }, data: { type: Schema.Types.Mixed, default: {} }, submittedAt: Date, approvedAt: Date, approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null } }, { timestamps: true });
const ProjectHandover = models.ProjectHandover || model("ProjectHandover", schema);
export default ProjectHandover;
