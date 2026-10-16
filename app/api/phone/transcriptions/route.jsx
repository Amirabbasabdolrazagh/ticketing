import { after } from "next/server";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import PhoneCall from "@/models/phoneCalls";
import { canUsePhone } from "@/lib/phoneAccess";
import { transcribePhoneCall } from "@/lib/phoneTranscription";

export async function POST(req) {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    if (!canUsePhone(user)) return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
    const { callId } = await req.json();
    const call = await PhoneCall.findOne({ callId: String(callId || "") });
    if (!call?.recording?.storedName) return Response.json({ success: false, message: "فایل مکالمه موجود نیست" }, { status: 404 });
    if (user.role !== "admin" && call.agent.toString() !== user._id.toString()) return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
    if (call.transcription?.status === "processing") return Response.json({ success: true, message: "تبدیل متن در حال انجام است" });
    call.transcription.status = "pending";
    call.transcription.error = "";
    await call.save();
    after(() => transcribePhoneCall(call.callId));
    return Response.json({ success: true, message: "تبدیل کامل مکالمه در صف قرار گرفت" });
  } catch (error) {
    console.error("PHONE TRANSCRIPTION RETRY ERROR", error);
    return Response.json({ success: false, message: "شروع تبدیل متن ناموفق بود" }, { status: 500 });
  }
}
