import crypto from "crypto";
import { isValidObjectId } from "mongoose";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import PhoneDevice from "@/models/phoneDevices";
import PhoneSettings from "@/models/phoneSettings";
import User from "@/models/users";
import { canUsePhone } from "@/lib/phoneAccess";
import { encryptPhoneSecret } from "@/lib/phoneCrypto";
import { provisionWebRtcDevice } from "@/lib/issabelDiscovery";

export async function GET() {
  await ConnectDb();
  const user = await getCurrentUser();
  if (!canUsePhone(user)) return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
  const devices = await PhoneDevice.find(user.role === "admin" ? {} : { user: user._id })
    .populate("user", "name role pbxExtension").populate("approvedBy", "name").sort({ createdAt: -1 }).lean();
  return Response.json({ success: true, devices });
}

export async function POST(req) {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    if (!canUsePhone(user)) return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
    const body = await req.json();
    const deviceId = String(body.deviceId || "").trim();
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(deviceId)) return Response.json({ success: false, message: "شناسه دستگاه معتبر نیست" }, { status: 400 });
    const existing = await PhoneDevice.findOne({ deviceId });
    if (existing && existing.user.toString() !== user._id.toString()) return Response.json({ success: false, message: "این دستگاه قبلاً ثبت شده است" }, { status: 409 });
    const wasRevoked = existing?.status === "revoked";
    const device = existing || await PhoneDevice.create({
      user: user._id,
      deviceId,
      label: String(body.label || "مرورگر پشتیبان").trim().slice(0, 80),
      fingerprint: String(body.fingerprint || "").trim().slice(0, 180),
      ipHash: crypto.createHash("sha256").update(req.headers.get("x-forwarded-for") || "unknown").digest("hex"),
    });
    if (wasRevoked) {
      device.status = "pending";
      device.approvedBy = null;
      device.approvedAt = null;
      device.revokedAt = null;
      device.sipUsername = "";
      device.secretCiphertext = ""; device.secretIv = ""; device.secretTag = "";
      await device.save();
    }
    return Response.json({ success: true, message: wasRevoked ? "درخواست فعال‌سازی مجدد برای مدیر ارسال شد" : existing ? "درخواست این دستگاه قبلاً ثبت شده است" : "درخواست دستگاه برای تأیید مدیر ثبت شد", device: { id: device._id, status: device.status } }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error("PHONE DEVICE POST ERROR", error);
    return Response.json({ success: false, message: "ثبت دستگاه ناموفق بود" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    await ConnectDb();
    const admin = await getCurrentUser();
    if (admin?.role !== "admin") return Response.json({ success: false, message: "فقط مدیر سیستم مجاز است" }, { status: 403 });
    const body = await req.json();
    if (!isValidObjectId(body.deviceId)) return Response.json({ success: false, message: "دستگاه معتبر نیست" }, { status: 400 });
    const device = await PhoneDevice.findById(body.deviceId).select("+secretCiphertext +secretIv +secretTag");
    if (!device) return Response.json({ success: false, message: "دستگاه پیدا نشد" }, { status: 404 });
    const settings = await PhoneSettings.findOne({ key: "default" }).select("issabelHost provisioningStatus").lean();
    const issabelPassword = String(body.issabelPassword || "");
    if (!settings?.issabelHost) return Response.json({ success: false, message: "ابتدا ایزابل را در تنظیمات تلفن شناسایی کنید" }, { status: 409 });
    if (issabelPassword.length < 8) return Response.json({ success: false, message: "رمز SSH ایزابل برای این عملیات لازم است" }, { status: 400 });
    const owner = await User.findById(device.user).select("name pbxExtension").lean();
    if (body.action === "revoke") {
      if (device.sipUsername) await provisionWebRtcDevice({ host: settings.issabelHost, password: issabelPassword, username: device.sipUsername, secret: "", remove: true });
      device.status = "revoked";
      device.revokedAt = new Date();
      device.secretCiphertext = ""; device.secretIv = ""; device.secretTag = "";
    } else if (body.action === "approve") {
      if (!owner?.pbxExtension || !/^\d{2,8}$/.test(owner.pbxExtension)) return Response.json({ success: false, message: "ابتدا داخلی پشتیبان را در حساب کاربری او تعریف کنید" }, { status: 422 });
      const suffix = crypto.createHash("sha256").update(device.deviceId).digest("hex").slice(0, 8);
      const sipUsername = `web-${owner.pbxExtension}-${suffix}`;
      const sipSecret = crypto.randomBytes(24).toString("base64url");
      await provisionWebRtcDevice({ host: settings.issabelHost, password: issabelPassword, username: sipUsername, secret: sipSecret });
      const encrypted = encryptPhoneSecret(sipSecret);
      device.sipUsername = sipUsername;
      device.secretCiphertext = encrypted.ciphertext; device.secretIv = encrypted.iv; device.secretTag = encrypted.tag;
      device.status = "active"; device.approvedBy = admin._id; device.approvedAt = new Date(); device.revokedAt = null;
    } else return Response.json({ success: false, message: "عملیات معتبر نیست" }, { status: 400 });
    await device.save();
    return Response.json({ success: true, message: body.action === "approve" ? `دستگاه ${owner?.name || "پشتیبان"} با داخلی WebRTC اختصاصی فعال شد` : "دسترسی دستگاه از سایت و ایزابل قطع شد" });
  } catch (error) {
    console.error("PHONE DEVICE PATCH ERROR", error);
    return Response.json({ success: false, message: error.message || "به‌روزرسانی دستگاه ناموفق بود" }, { status: 500 });
  }
}
