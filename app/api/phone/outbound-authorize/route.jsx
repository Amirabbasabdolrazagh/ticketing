import crypto from "node:crypto";
import ConnectDb from "@/utils/connectDB";
import PhoneCall from "@/models/phoneCalls";
import PhoneDevice from "@/models/phoneDevices";
import PhoneSettings from "@/models/phoneSettings";
import getCurrentUser from "@/utils/auth";
import { adminDialNumber } from "@/lib/issabelAmi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function signed(raw, signature, timestamp) {
  const secret = process.env.PHONE_INBOUND_ROUTER_SECRET;
  if (!secret || !/^\d{10}$/.test(timestamp || "") || Math.abs(Date.now() - Number(timestamp) * 1000) > 30000) return false;
  const expected = crypto.createHmac("sha256", secret).update(timestamp + "." + raw).digest("hex");
  return /^[a-f0-9]{64}$/.test(signature || "") && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// Phase 1: prepare a short-lived, one-time authorization. No AMI originate is triggered.
export async function POST(req) {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    if (user?.role !== "admin") return Response.json({ success: false }, { status: 403 });
    const body = await req.json();
    const device = await PhoneDevice.findOne({ user: user._id, deviceId: String(body.deviceId || ""), status: "active" }).select("sipUsername");
    if (!device?.sipUsername?.startsWith("web-admin-")) return Response.json({ success: false, message: "دستگاه ادمین تأیید نشده است" }, { status: 403 });
    const dialNumber = adminDialNumber(body.number);
    const callId = crypto.randomUUID();
    const token = Array.from({ length: 24 }, () => crypto.randomInt(0, 10)).join("");
    const settings = await PhoneSettings.findOne({ key: "default" }).select("recordingEnabled").lean();
    await PhoneCall.create({
      callId, agent: user._id, device: device._id, direction: "outbound", status: "initiated",
      customerDisplayName: "تماس مستقیم مدیر", maskedTarget: "شماره محرمانه",
      directDial: { tokenHash: crypto.createHash("sha256").update(token).digest("hex"), dialNumber,
        sipUsername: device.sipUsername, expiresAt: new Date(Date.now() + 45000),
        recordingEnabled: settings?.recordingEnabled !== false, consumedAt: null },
    });
    return Response.json({ success: true, callId, token, expiresInSeconds: 45 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ success: false, message: error.message || "صدور مجوز تماس ناموفق بود" }, { status: 400 });
  }
}

export async function PUT(req) {
  try {
    const raw = await req.text();
    if (!signed(raw, req.headers.get("x-phone-signature"), req.headers.get("x-phone-timestamp"))) return Response.json({ authorized: false }, { status: 401 });
    const { token, sipUsername } = JSON.parse(raw);
    if (!/^\d{24}$/.test(token || "") || !/^web-admin-[a-z0-9-]{4,70}$/.test(sipUsername || "")) return Response.json({ authorized: false }, { status: 400 });
    await ConnectDb();
    const call = await PhoneCall.findOneAndUpdate({
      "directDial.tokenHash": crypto.createHash("sha256").update(token).digest("hex"),
      "directDial.sipUsername": sipUsername,
      "directDial.expiresAt": { $gt: new Date() },
      "directDial.consumedAt": null,
      direction: "outbound", status: "initiated",
    }, { $set: { "directDial.consumedAt": new Date(), status: "ringing" } }, { new: true }).select("+directDial.dialNumber +directDial.recordingEnabled");
    if (!call) return Response.json({ authorized: false }, { status: 403 });
    const device = await PhoneDevice.findOne({ _id: call.device, user: call.agent, status: "active", sipUsername }).select("_id").lean();
    if (!device) return Response.json({ authorized: false }, { status: 403 });
    return Response.json({ authorized: true, dialNumber: call.directDial.dialNumber,
      callId: call.callId, recordingEnabled: call.directDial.recordingEnabled }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ authorized: false }, { status: 500 });
  }
}
