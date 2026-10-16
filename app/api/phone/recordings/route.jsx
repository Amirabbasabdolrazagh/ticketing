import crypto from "crypto";
import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import PhoneCall from "@/models/phoneCalls";
import { after } from "next/server";
import { transcribePhoneCall } from "@/lib/phoneTranscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECORDING_ROOT = process.env.PHONE_RECORDING_PATH || "/app/storage/call-recordings";
const MAX_SIZE = 250 * 1024 * 1024;

function validSignature({ callId, timestamp, bytes, signature }) {
  const secret = process.env.PHONE_RECORDING_WEBHOOK_SECRET;
  if (!secret || !signature || !timestamp || Math.abs(Date.now() - Number(timestamp) * 1000) > 300000) return false;
  const bodyHash = crypto.createHash("sha256").update(bytes).digest("hex");
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${callId}.${bodyHash}`).digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(String(signature));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function POST(req) {
  try {
    const callId = String(req.headers.get("x-phone-call-id") || "").trim();
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(callId)) return Response.json({ success: false, message: "شناسه تماس معتبر نیست" }, { status: 400 });
    const bytes = Buffer.from(await req.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_SIZE) return Response.json({ success: false, message: "حجم فایل معتبر نیست" }, { status: 413 });
    if (!validSignature({ callId, timestamp: req.headers.get("x-phone-timestamp"), bytes, signature: req.headers.get("x-phone-signature") })) {
      return Response.json({ success: false, message: "امضای فایل معتبر نیست" }, { status: 401 });
    }
    await ConnectDb();
    const call = await PhoneCall.findOne({ callId });
    if (!call) return Response.json({ success: false, message: "تماس پیدا نشد" }, { status: 404 });
    const mimeType = String(req.headers.get("content-type") || "audio/wav").slice(0, 100);
    const extension = mimeType.includes("mpeg") ? "mp3" : mimeType.includes("ogg") ? "ogg" : "wav";
    const storedName = `${callId}-${Date.now()}.${extension}`;
    await mkdir(RECORDING_ROOT, { recursive: true });
    await writeFile(path.join(RECORDING_ROOT, storedName), bytes, { flag: "wx" });
    call.recording = { storedName, mimeType, size: bytes.length, uploadedAt: new Date() };
    call.transcription.status = "pending";
    await call.save();
    after(() => transcribePhoneCall(callId));
    return Response.json({ success: true });
  } catch (error) {
    console.error("PHONE RECORDING UPLOAD ERROR", error);
    return Response.json({ success: false, message: "ثبت فایل مکالمه ناموفق بود" }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    if (!user) return Response.json({ success: false, message: "ورود الزامی است" }, { status: 401 });
    const callId = new URL(req.url).searchParams.get("callId") || "";
    const call = await PhoneCall.findOne({ callId }).lean();
    if (!call?.recording?.storedName) return Response.json({ success: false, message: "فایل مکالمه موجود نیست" }, { status: 404 });
    if (user.role !== "admin" && call.agent?.toString() !== user._id.toString()) return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
    const safeName = path.basename(call.recording.storedName);
    const file = await readFile(path.join(RECORDING_ROOT, safeName));
    return new Response(file, { headers: { "Content-Type": call.recording.mimeType || "audio/wav", "Content-Disposition": `inline; filename="${safeName}"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("PHONE RECORDING GET ERROR", error);
    return Response.json({ success: false, message: "دریافت فایل مکالمه ناموفق بود" }, { status: 500 });
  }
}
