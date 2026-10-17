import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import PhoneCall from "@/models/phoneCalls";
import { canUsePhone } from "@/lib/phoneAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!canUsePhone(user) || user.role === "admin") return Response.json({ success: false }, { status: 403 });
    await ConnectDb();
    const call = await PhoneCall.findOne({
      agent: user._id,
      direction: "inbound",
      status: "ringing",
      startedAt: { $gte: new Date(Date.now() - 90000) },
    }).sort({ startedAt: -1 }).select("callId customerDisplayName startedAt").lean();
    return Response.json({ success: true, call: call ? {
      callId: call.callId,
      customerName: /\d{6,}/.test(call.customerDisplayName || "") ? "مشتری سازمانی" : call.customerDisplayName || "مشتری سازمانی",
      startedAt: call.startedAt,
    } : null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("PHONE INCOMING ERROR", error);
    return Response.json({ success: false }, { status: 500 });
  }
}
