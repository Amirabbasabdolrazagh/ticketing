import { randomBytes } from "crypto";
import getCurrentUser from "@/utils/auth";
import User from "@/models/users";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ success: false, message: "user unauthorized" }, { status: 401 });
  }
  if (!["admin", "agent", "passive_agent", "active_agent", "customer"].includes(user.role)) {
    return Response.json({ success: false, message: "دسترسی اتصال پیام‌رسان برای این حساب مجاز نیست" }, { status: 403 });
  }

  const botUsername = process.env.BALE_BOT_USERNAME
    ?.trim()
    .replace(/^https?:\/\/(www\.)?(ble\.ir|bale\.ai)\//, "")
    .replace(/^@/, "")
    .replace(/\/$/, "");
  if (!botUsername || !process.env.BALE_BOT_TOKEN || !process.env.BALE_WEBHOOK_SECRET) {
    return Response.json(
      { success: false, message: "تنظیمات ربات بله کامل نیست" },
      { status: 503 },
    );
  }

  const token = randomBytes(24).toString("base64url");
  await User.findByIdAndUpdate(user._id, {
    baleLinkToken: token,
    baleLinkExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  return Response.json({
    success: true,
    url: `https://ble.ir/${botUsername}?start=${encodeURIComponent(token)}`,
  });
}
