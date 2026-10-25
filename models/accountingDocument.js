import { model, models, Schema } from "mongoose";
export const CATEGORIES = ["quarterly_transactions", "tax_vat", "purchase_invoice", "sales_invoice"];
const schema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  category: { type: String, required: true, enum: CATEGORIES, index: true },
  documentDate: { type: Date, required: true, index: true },
  referenceNumber: { type: String, trim: true, maxlength: 100, default: "" },
  notes: { type: String, trim: true, maxlength: 1000, default: "" },
  originalName: { type: String, required: true, maxlength: 180 },
  storageKey: { type: String, required: true, select: false },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
schema.index({ category: 1, documentDate: -1 });
export default models.AccountingDocument || model("AccountingDocument", schema);
