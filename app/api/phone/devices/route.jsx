import crypto from "crypto";
import { isValidObjectId } from "mongoose";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import PhoneDevice from "@/models/phoneDevices";
import User from "@/models/users";
import { canUsePhone } from "@/lib/phoneAccess";
import { encryptPhoneSecret } from "@/lib/phoneCrypto";

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
    const device = existing || await PhoneDevice.create({
      user: user._id,
      deviceId,
      label: String(body.label || "مرورگر پشتیبان").trim().slice(0, 80),
      fingerprint: String(body.fingerprint || "").trim().slice(0, 180),
      ipHash: crypto.createHash("sha256").update(req.headers.get("x-forwarded-for") || "unknown").digest("hex"),
    });
    return Response.json({ success: true, message: existing ? "درخواست این دستگاه قبلاً ثبت شده است" : "درخواست دستگاه برای تأیید مدیر ثبت شد", device: { id: device._id, status: device.status } }, { status: existing ? 200 : 201 });
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
    if (body.action === "revoke") {
      device.status = "revoked";
      device.revokedAt = new Date();
      device.secretCiphertext = ""; device.secretIv = ""; device.secretTag = "";
    } else if (body.action === "approve") {
      const sipUsername = String(body.sipUsername || "").trim();
      const sipSecret = String(body.sipSecret || "");
      if (!sipUsername || sipSecret.length < 12) return Response.json({ success: false, message: "نام کاربری SIP و رمز حداقل ۱۲ کاراکتری الزامی است" }, { status: 400 });
      const encrypted = encryptPhoneSecret(sipSecret);
      device.sipUsername = sipUsername;
      device.secretCiphertext = encrypted.ciphertext; device.secretIv = encrypted.iv; device.secretTag = encrypted.tag;
      device.status = "active"; device.approvedBy = admin._id; device.approvedAt = new Date(); device.revokedAt = null;
    } else return Response.json({ success: false, message: "عملیات معتبر نیست" }, { status: 400 });
    await device.save();
    const owner = await User.findById(device.user).select("name").lean();
    return Response.json({ success: true, message: body.action === "approve" ? `دستگاه ${owner?.name || "پشتیبان"} فعال شد` : "دسترسی دستگاه قطع شد" });
  } catch (error) {
    console.error("PHONE DEVICE PATCH ERROR", error);
    return Response.json({ success: false, message: "به‌روزرسانی دستگاه ناموفق بود" }, { status: 500 });
  }
}
