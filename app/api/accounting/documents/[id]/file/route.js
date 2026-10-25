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
    const preview = new URL(req.url).searchParams.get("preview") === "1";
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": preview ? doc.mimeType : "application/octet-stream",
      "Content-Disposition": (preview ? "inline" : "attachment") + '; filename="archive-' + id + "." + extension + '"',
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
    } });
  } catch (error) { console.error("Accounting download error", error); return Response.json({ success: false }, { status: 500 }); }
}
