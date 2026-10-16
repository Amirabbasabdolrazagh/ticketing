import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import PhoneSettings from "@/models/phoneSettings";
import { encryptPhoneSecret } from "@/lib/phoneCrypto";

const urlPattern = /^wss:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/.*)?$/;

export async function GET() {
  await ConnectDb();
  const user = await getCurrentUser();
  if (user?.role !== "admin") return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
  const settings = await PhoneSettings.findOne({ key: "default" }).lean();
  return Response.json({ success: true, settings });
}

export async function PATCH(req) {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    if (user?.role !== "admin") return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
    const body = await req.json();
    const wssUrl = String(body.wssUrl || "").trim();
    const sipDomain = String(body.sipDomain || "").trim();
    if (wssUrl && !urlPattern.test(wssUrl)) return Response.json({ success: false, message: "آدرس WSS معتبر نیست" }, { status: 400 });
    if (sipDomain && !/^[A-Za-z0-9.-]+$/.test(sipDomain)) return Response.json({ success: false, message: "دامنه SIP معتبر نیست" }, { status: 400 });
    const current = await PhoneSettings.findOne({ key: "default" }).select("+iceServers.credentialCiphertext +iceServers.credentialIv +iceServers.credentialTag").lean();
    const iceServers = Array.isArray(body.iceServers) ? body.iceServers.filter((item) => item?.urls).slice(0, 5).map((item) => {
      const urls = String(item.urls).trim();
      const encrypted = item.credential ? encryptPhoneSecret(String(item.credential)) : null;
      const previous = current?.iceServers?.find((server) => server.urls === urls && server.username === String(item.username || "").trim());
      return {
        urls,
        username: String(item.username || "").trim(),
        ...(encrypted ? {
          credentialCiphertext: encrypted.ciphertext,
          credentialIv: encrypted.iv,
          credentialTag: encrypted.tag,
        } : previous?.credentialCiphertext ? {
          credentialCiphertext: previous.credentialCiphertext,
          credentialIv: previous.credentialIv,
          credentialTag: previous.credentialTag,
        } : {}),
      };
    }) : [];
    const settings = await PhoneSettings.findOneAndUpdate({ key: "default" }, {
      $set: {
        wssUrl, sipDomain,
        outboundProxy: String(body.outboundProxy || "").trim(),
        companyCallerId: String(body.companyCallerId || "").trim(),
        recordingEnabled: body.recordingEnabled !== false,
        recordingConsentText: String(body.recordingConsentText || "").trim(),
        retentionDays: Math.max(1, Math.min(3650, Number(body.retentionDays) || 365)),
        allowHold: body.allowHold !== false,
        allowTransfer: body.allowTransfer !== false,
        iceServers,
        updatedBy: user._id,
      },
    }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
    return Response.json({ success: true, message: "تنظیمات تلفن ذخیره شد", settings });
  } catch (error) {
    console.error("PHONE SETTINGS PATCH ERROR", error);
    return Response.json({ success: false, message: "ذخیره تنظیمات ناموفق بود" }, { status: 500 });
  }
}
