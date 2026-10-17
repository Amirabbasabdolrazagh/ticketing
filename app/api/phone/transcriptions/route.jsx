import { after } from "next/server";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import PhoneCall from "@/models/phoneCalls";
import { canUsePhone } from "@/lib/phoneAccess";
import { transcribePhoneCall } from "@/lib/phoneTranscription";
import { transcribePhoneCallWithGoogle } from "@/lib/googlePhoneTranscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 1800;

async function authorizedCall(callId) {
  await ConnectDb();
  const user = await getCurrentUser();
  if (!canUsePhone(user)) return { response: Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 }) };
  const call = await PhoneCall.findOne({ callId: String(callId || "") });
  if (!call?.recording?.storedName) return { response: Response.json({ success: false, message: "فایل مکالمه موجود نیست" }, { status: 404 }) };
  if (user.role !== "admin" && call.agent.toString() !== user._id.toString()) {
    return { response: Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 }) };
  }
  return { call };
}

export async function GET(req) {
  try {
    const { call, response } = await authorizedCall(new URL(req.url).searchParams.get("callId"));
    if (response) return response;
    return Response.json({ success: true, transcript: call.transcript, transcription: call.transcription,
      googleTranscription: call.googleTranscription, analysis: call.analysis }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("PHONE TRANSCRIPTION STATUS ERROR", error);
    return Response.json({ success: false, message: "دریافت نتیجه تبدیل ناموفق بود" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!["shenava", "google"].includes(body.engine)) return Response.json({ success: false, message: "موتور تبدیل معتبر نیست" }, { status: 400 });
    const { call, response } = await authorizedCall(body.callId);
    if (response) return response;
    if (body.engine === "google") {
      if (!process.env.GOOGLE_CLOUD_STT_BUCKET || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        return Response.json({ success: false, message: "ابتدا باکت و حساب سرویس Google Cloud را روی سرور تلفن تنظیم کنید." }, { status: 503 });
      }
      if (["processing", "pending"].includes(call.googleTranscription?.status)) {
        return Response.json({ success: true, message: "تبدیل با گوگل در حال انجام است" });
      }
      const claimed = await PhoneCall.updateOne({ _id: call._id, "googleTranscription.status": { $nin: ["pending", "processing"] } }, { $set: {
        "googleTranscription.status": "pending", "googleTranscription.error": "", "googleTranscription.startedAt": new Date(),
      } });
      if (!claimed.modifiedCount) return Response.json({ success: true, message: "تبدیل با گوگل در حال انجام است" });
      after(() => transcribePhoneCallWithGoogle(call.callId));
      return Response.json({ success: true, message: "تبدیل با گوگل آغاز شد؛ نتیجه جدا از متن شنوا ذخیره می‌شود." });
    }
    if (["processing", "pending"].includes(call.transcription?.status)) return Response.json({ success: true, message: "تبدیل متن در حال انجام است" });
    call.transcription.status = "pending";
    call.transcription.error = "";
    await call.save();
    after(() => transcribePhoneCall(call.callId));
    return Response.json({ success: true, message: "تبدیل با شنوا در صف قرار گرفت" });
  } catch (error) {
    console.error("PHONE TRANSCRIPTION RETRY ERROR", error);
    return Response.json({ success: false, message: "شروع تبدیل متن ناموفق بود" }, { status: 500 });
  }
}
