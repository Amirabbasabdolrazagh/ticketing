import mongoose, { model, models, Schema } from "mongoose";

const projectCounterSchema = new Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      unique: true,
    },

    sequence: {
      type: Number,
      default: 0,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

const ProjectCounter =
  models.ProjectCounter || model("ProjectCounter", projectCounterSchema);

export default ProjectCounter;
