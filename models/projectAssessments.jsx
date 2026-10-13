import mongoose, { model, models, Schema } from "mongoose";

const projectAssessmentSchema = new Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: "InstallationProject", default: null, index: true },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  assigneeRole: { type: String, enum: ["passive_agent", "active_agent"], required: true },
  status: { type: String, enum: ["assigned", "in_progress", "submitted", "reviewed"], default: "assigned" },
  data: { type: Schema.Types.Mixed, default: {} },
  openedAt: Date,
  lastSavedAt: Date,
  progressPercent: { type: Number, min: 0, max: 100, default: 0 },
  jobBrief: { type: Schema.Types.Mixed, default: {} },
  jobBriefStatus: { type: String, enum: ["draft", "issued", "acknowledged"], default: "draft" },
  jobBriefProgressPercent: { type: Number, min: 0, max: 100, default: 0 },
  jobBriefIssuedAt: Date,
  jobBriefIssuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  jobBriefViewedAt: Date,
  jobBriefAcknowledgedAt: Date,
  attachments: [{ name: String, path: String, mimeType: String, size: Number }],
  submittedAt: Date,
  reviewedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewNote: { type: String, default: "" },
}, { timestamps: true });

const ProjectAssessment = models.ProjectAssessment || model("ProjectAssessment", projectAssessmentSchema);
export default ProjectAssessment;
