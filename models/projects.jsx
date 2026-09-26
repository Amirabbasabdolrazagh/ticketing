import mongoose, { model, models, Schema } from "mongoose";
const projectSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      required: true,
      maxlength: 450,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    defaultAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    subcategories: [{ type: String, trim: true, maxlength: 80 }],
    keywords: [{ type: String, trim: true, maxlength: 60 }],
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 10,
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const Project = models.Project || model("Project", projectSchema);
export default Project;
