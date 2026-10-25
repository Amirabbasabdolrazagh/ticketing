import { accountingAccess, cleanDate, cleanText, MAX_SIZE, removeFile, saveFile, validCategory } from "@/lib/accountingArchive";
import AccountingDocument from "@/models/accountingDocument";
export const runtime = "nodejs";
const err = (message, status) => Response.json({ success: false, message }, { status });

export async function GET(req) {
  try {
    const access = await accountingAccess();
    if (access.error) return access.error;
    const query = new URL(req.url).searchParams;
    const category = query.get("category") || "";
    if (category && !validCategory(category)) return err("دسته‌بندی نامعتبر", 400);
    const raw = (query.get("search") || "").trim().slice(0, 120);
    const search = raw.replace(/[.*+?^$()|[\]{}\\]/g, "\\$&");
    const page = Math.max(1, Math.min(10000, parseInt(query.get("page") || "1", 10) || 1));
    const filter = {};
    if (category) filter.category = category;
    if (search) filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { referenceNumber: { $regex: search, $options: "i" } },
    ];
    const [documents, total] = await Promise.all([
      AccountingDocument.find(filter).sort({ documentDate: -1, createdAt: -1 }).skip((page - 1) * 30).limit(30).lean(),
      AccountingDocument.countDocuments(filter),
    ]);
    return Response.json({ success: true, documents, total, page, limit: 30 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Accounting list error", error);
    return err("خطای سرور", 500);
  }
}

export async function POST(req) {
  try {
    const access = await accountingAccess();
    if (access.error) return access.error;
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_SIZE + 1024 * 1024) return err("درخواست بیش از حد بزرگ است", 413);
    const data = await req.formData();
    const title = cleanText(data.get("title"), 180, true);
    const category = data.get("category");
    const documentDate = cleanDate(data.get("documentDate"));
    const referenceNumber = cleanText(data.get("referenceNumber") || "", 100);
    const notes = cleanText(data.get("notes") || "", 1000);
    const file = data.get("file");
    if (!title || !validCategory(category) || !documentDate || referenceNumber === null || notes === null) return err("اطلاعات سند نامعتبر است", 400);
    if (!file || typeof file.arrayBuffer !== "function" || typeof file.name !== "string") return err("فایل الزامی است", 400);
    if (!file.size || file.size > MAX_SIZE) return err("حداکثر حجم فایل ۱۵ مگابایت است", 413);
    const originalName = cleanText(file.name.replaceAll(/[/\\]/g, "_"), 180, true);
    if (!originalName) return err("نام فایل نامعتبر است", 400);
    const bytes = Buffer.from(await file.arrayBuffer());
    let stored;
    try { stored = await saveFile(bytes); } catch (error) {
      if (error.message === "INVALID_TYPE") return err("فقط PDF، JPG، PNG یا WEBP مجاز است", 415);
      if (error.message === "INVALID_SIZE") return err("حجم فایل نامعتبر است", 413);
      throw error;
    }
    try {
      const doc = await AccountingDocument.create({
        title, category, documentDate, referenceNumber, notes, originalName,
        storageKey: stored.storageKey, mimeType: stored.mimeType, size: bytes.length, createdBy: access.user._id,
      });
      return Response.json({ success: true, document: { id: doc._id, title: doc.title } }, { status: 201 });
    } catch (error) { await removeFile(stored.storageKey).catch(() => {}); throw error; }
  } catch (error) {
    console.error("Accounting upload error", error);
    return err("ثبت سند ناموفق بود", 500);
  }
}
