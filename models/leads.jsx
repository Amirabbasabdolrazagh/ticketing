import { model, models, Schema } from "mongoose";

const leadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 70 },
    phone: { type: String, required: true, trim: true, maxlength: 11, index: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    source: { type: String, enum: ["website"], default: "website", index: true },
    status: { type: String, enum: ["new", "contacted", "qualified", "converted", "lost"], default: "new", index: true },
    notes: { type: String, trim: true, maxlength: 3000, default: "" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

const Lead = models.Lead || model("Lead", leadSchema);
export default Lead;
