import mongoose, { model, models, Schema } from "mongoose";

const projectAssessmentSchema = new Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  assigneeRole: { type: String, enum: ["passive_agent", "active_agent"], required: true },
  status: { type: String, enum: ["assigned", "in_progress", "submitted", "reviewed"], default: "assigned" },
  data: { type: Schema.Types.Mixed, default: {} },
  jobBrief: { type: Schema.Types.Mixed, default: {} },
  jobBriefStatus: { type: String, enum: ["draft", "issued", "acknowledged"], default: "draft" },
  jobBriefIssuedAt: Date,
  jobBriefIssuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  attachments: [{ name: String, path: String, mimeType: String, size: Number }],
  submittedAt: Date,
  reviewedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

const ProjectAssessment = models.ProjectAssessment || model("ProjectAssessment", projectAssessmentSchema);
export default ProjectAssessment;
