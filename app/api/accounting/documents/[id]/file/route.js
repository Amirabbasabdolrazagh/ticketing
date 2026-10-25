import mongoose from "mongoose";
import { accountingAccess, loadFile } from "@/lib/accountingArchive";
import AccountingDocument from "@/models/accountingDocument";
export const runtime = "nodejs";
export async function GET(req, { params }) {
  try {
    const access = await accountingAccess();
    if (access.error) return access.error;
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ success: false }, { status: 400 });
    const doc = await AccountingDocument.findById(id).select("+storageKey");
    if (!doc) return Response.json({ success: false, message: "سند یافت نشد" }, { status: 404 });
    const bytes = await loadFile(doc.storageKey);
    const extension = doc.storageKey.split(".").pop();
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": 'attachment; filename="archive-' + id + "." + extension + '"',
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    } });
  } catch (error) { console.error("Accounting download error", error); return Response.json({ success: false }, { status: 500 }); }
}
