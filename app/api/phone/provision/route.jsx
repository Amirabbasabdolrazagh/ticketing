import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import PhoneSettings from "@/models/phoneSettings";
import { discoverIssabel, validateIssabelHost } from "@/lib/issabelDiscovery";
import { encryptPhoneSecret } from "@/lib/phoneCrypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function automaticPublicSettings() {
  const phoneUrl = process.env.NEXT_PUBLIC_PHONE_URL || "https://phone.itrasam.com/phone";
  const publicOrigin = new URL(phoneUrl).origin;
  const turnUrl = String(process.env.PHONE_TURN_URL || "").trim();
  const turnUsername = String(process.env.PHONE_TURN_USERNAME || "").trim();
  const turnSecret = String(process.env.PHONE_TURN_SECRET || "");
  return {
    wssUrl: process.env.PHONE_PUBLIC_WSS_URL || `${publicOrigin}/sip-wss`,
    sipDomain: process.env.PHONE_SIP_DOMAIN || new URL(publicOrigin).hostname,
    outboundProxy: "",
    companyCallerId: process.env.ISSABEL_COMPANY_CALLER_ID || "",
    iceServers: turnUrl ? [{
      urls: turnUrl,
      username: turnUsername,
      ...(turnSecret ? (() => {
        const encrypted = encryptPhoneSecret(turnSecret);
        return { credentialCiphertext: encrypted.ciphertext, credentialIv: encrypted.iv, credentialTag: encrypted.tag };
      })() : {}),
    }] : [],
  };
}

export async function POST(req) {
  try {
    await ConnectDb();
    const admin = await getCurrentUser();
    if (admin?.role !== "admin") return Response.json({ success: false, message: "فقط مدیر سیستم مجاز است" }, { status: 403 });
    const body = await req.json();
    const host = validateIssabelHost(body.host);
    const password = String(body.password || "");
    if (password.length < 8 || password.length > 300) return Response.json({ success: false, message: "رمز مدیریتی ایزابل معتبر نیست" }, { status: 400 });

    const discovery = await discoverIssabel({ host, password });
    const capabilities = discovery.capabilities;
    const ready = capabilities.amiEnabled && capabilities.httpEnabled && capabilities.httpsEnabled && capabilities.pjsipEnabled && capabilities.websocketEnabled;
    const automatic = automaticPublicSettings();
    const settings = await PhoneSettings.findOneAndUpdate({ key: "default" }, { $set: {
      ...automatic,
      issabelHost: host,
      provisioningStatus: ready ? "ready" : "action_required",
      detectedAsteriskVersion: discovery.version,
      detectedAt: new Date(),
      detectedCapabilities: capabilities,
      updatedBy: admin._id,
    } }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();

    return Response.json({
      success: true,
      message: ready ? "ایزابل شناسایی شد و تنظیمات عمومی تلفن به‌صورت خودکار ثبت شد" : "ایزابل شناسایی شد؛ بعضی پیش‌نیازهای WebRTC هنوز روی آن فعال نیست",
      settings,
      discovery: { version: discovery.version, capabilities, ready },
    });
  } catch (error) {
    console.error("ISSABEL PROVISION ERROR", error);
    return Response.json({ success: false, message: error.message || "کشف خودکار ایزابل ناموفق بود" }, { status: 500 });
  }
}
