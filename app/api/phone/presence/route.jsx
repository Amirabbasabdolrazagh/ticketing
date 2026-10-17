import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import PhoneDevice from "@/models/phoneDevices";
import { canUsePhone } from "@/lib/phoneAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!canUsePhone(user)) return Response.json({ success: false }, { status: 403 });
    const body = await req.json();
    const deviceId = String(body.deviceId || "");
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(deviceId) || !["online", "offline"].includes(body.status)) {
      return Response.json({ success: false }, { status: 400 });
    }
    await ConnectDb();
    const now = new Date();
    const result = await PhoneDevice.updateOne(
      { user: user._id, deviceId, status: "active" },
      { $set: { lastSeenAt: now, lastRegisteredAt: body.status === "online" ? now : null } },
    );
    return Response.json({ success: result.matchedCount === 1 }, { status: result.matchedCount === 1 ? 200 : 404 });
  } catch (error) {
    console.error("PHONE PRESENCE ERROR", error);
    return Response.json({ success: false }, { status: 500 });
  }
}
