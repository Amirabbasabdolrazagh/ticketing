import mongoose from "mongoose";
import { accountingAccess, cleanDate, cleanText, removeFile, validCategory } from "@/lib/accountingArchive";
import AccountingDocument from "@/models/accountingDocument";
export const runtime = "nodejs";
const err = (message, status) => Response.json({ success: false, message }, { status });

export async function PATCH(req, { params }) {
  try {
    const access = await accountingAccess();
    if (access.error) return access.error;
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return err("شناسه نامعتبر", 400);
    const data = await req.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) return err("درخواست نامعتبر", 400);
    const allowed = ["title", "category", "documentDate", "referenceNumber", "notes"];
    if (!Object.keys(data).length || Object.keys(data).some((k) => !allowed.includes(k))) return err("فیلد نامعتبر", 400);
    const update = {};
    if ("title" in data) {
      update.title = cleanText(data.title, 180, true);
      if (!update.title) return err("عنوان نامعتبر", 400);
    }
    if ("category" in data) {
      if (!validCategory(data.category)) return err("دسته‌بندی نامعتبر", 400);
      update.category = data.category;
    }
    if ("documentDate" in data) {
      update.documentDate = cleanDate(data.documentDate);
      if (!update.documentDate) return err("تاریخ نامعتبر", 400);
    }
    for (const [k, max] of [["referenceNumber", 100], ["notes", 1000]]) {
      if (k in data) {
        update[k] = cleanText(data[k], max);
        if (update[k] === null) return err("متن نامعتبر", 400);
      }
    }
    const doc = await AccountingDocument.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
    if (!doc) return err("سند یافت نشد", 404);
    return Response.json({ success: true, document: doc });
  } catch (error) { console.error("Accounting PATCH error", error); return err("ویرایش ناموفق بود", 500); }
}

export async function DELETE(req, { params }) {
  try {
    const access = await accountingAccess();
    if (access.error) return access.error;
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return err("شناسه نامعتبر", 400);
    const doc = await AccountingDocument.findByIdAndDelete(id).select("+storageKey");
    if (!doc) return err("سند یافت نشد", 404);
    await removeFile(doc.storageKey).catch((error) => console.error("Accounting file cleanup error", error));
    return Response.json({ success: true });
  } catch (error) { console.error("Accounting DELETE error", error); return err("حذف ناموفق بود", 500); }
}
