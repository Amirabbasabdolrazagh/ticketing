import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import PhoneDevice from "@/models/phoneDevices";
import PhoneCall from "@/models/phoneCalls";
import PhoneSettings from "@/models/phoneSettings";
import Ticket from "@/models/tickets";
import "@/models/projects";
import { canUsePhone, customerHasSecureCall } from "@/lib/phoneAccess";
import { decryptPhoneSecret } from "@/lib/phoneCrypto";

export const dynamic = "force-dynamic";

function publicSettings(settings) {
  return {
    wssUrl: settings?.wssUrl || "",
    sipDomain: settings?.sipDomain || "",
    outboundProxy: settings?.outboundProxy || "",
    companyCallerId: settings?.companyCallerId || "",
    iceServers: (settings?.iceServers || []).map((item) => {
      let credential = "";
      if (item.credentialCiphertext) {
        credential = decryptPhoneSecret({ ciphertext: item.credentialCiphertext, iv: item.credentialIv, tag: item.credentialTag });
      }
      return { urls: item.urls, username: item.username || "", ...(credential ? { credential } : {}) };
    }),
    recordingEnabled: settings?.recordingEnabled !== false,
    recordingConsentText: settings?.recordingConsentText || "این مکالمه با هدف کنترل کیفیت و ثبت سوابق خدمات ضبط می‌شود.",
    retentionDays: settings?.retentionDays || 365,
    allowHold: settings?.allowHold !== false,
    allowTransfer: settings?.allowTransfer !== false,
  };
}

export async function GET(req) {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    if (!canUsePhone(user)) return Response.json({ success: false, message: "دسترسی به تلفن سازمانی مجاز نیست" }, { status: 403 });

    const deviceId = req.headers.get("x-phone-device-id")?.trim();
    const [settings, device, calls] = await Promise.all([
      PhoneSettings.findOne({ key: "default" }).select("+iceServers.credentialCiphertext +iceServers.credentialIv +iceServers.credentialTag").lean(),
      deviceId ? PhoneDevice.findOne({ user: user._id, deviceId }).select("+secretCiphertext +secretIv +secretTag").lean() : null,
      PhoneCall.find(user.role === "admin" ? {} : { agent: user._id })
        .populate("agent", "name pbxExtension")
        .populate("customer", "name")
        .populate("ticket", "title ticketNumber")
        .sort({ startedAt: -1 }).limit(40).lean(),
    ]);

    const ticketFilter = user.role === "admin" ? {} : { assignedTo: user._id };
    const tickets = await Ticket.find(ticketFilter)
      .populate("creator", "name organization")
      .populate("project", "name")
      .sort({ updatedAt: -1 }).limit(120).lean();
    const contacts = [];
    const seen = new Set();
    for (const ticket of tickets) {
      const customer = ticket.creator;
      if (!customer || seen.has(customer._id.toString()) || !(await customerHasSecureCall(customer._id))) continue;
      seen.add(customer._id.toString());
      contacts.push({
        id: customer._id.toString(),
        name: customer.name || "مشتری",
        ticketId: ticket._id.toString(),
        ticketNumber: ticket.ticketNumber,
        ticketTitle: ticket.title,
        service: ticket.project?.name || "سایر خدمات",
        status: ticket.status,
        priority: ticket.priority,
      });
    }

    let sip = null;
    if (device?.status === "active" && device.sipUsername && device.secretCiphertext) {
      sip = {
        username: device.sipUsername,
        password: decryptPhoneSecret({ ciphertext: device.secretCiphertext, iv: device.secretIv, tag: device.secretTag }),
      };
      await PhoneDevice.updateOne({ _id: device._id }, { $set: { lastSeenAt: new Date(), userAgent: req.headers.get("user-agent")?.slice(0, 300) || "" } });
    }

    const completed = calls.filter((call) => call.status === "completed");
    const answered = calls.filter((call) => call.answeredAt);
    const metrics = {
      total: calls.length,
      answered: answered.length,
      missed: calls.filter((call) => call.status === "missed").length,
      averageDuration: completed.length ? Math.round(completed.reduce((sum, call) => sum + (call.durationSeconds || 0), 0) / completed.length) : 0,
      satisfaction: calls.filter((call) => call.report?.satisfaction).length
        ? calls.filter((call) => call.report?.satisfaction).reduce((sum, call) => sum + call.report.satisfaction, 0) / calls.filter((call) => call.report?.satisfaction).length
        : null,
    };

    return Response.json({
      success: true,
      user: { id: user._id.toString(), name: user.name, role: user.role, extension: user.pbxExtension || "" },
      settings: publicSettings(settings),
      device: device ? { id: device._id.toString(), deviceId: device.deviceId, label: device.label, status: device.status, sipUsername: device.sipUsername } : null,
      sip,
      contacts,
      calls,
      metrics,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("PHONE BOOTSTRAP ERROR", error);
    return Response.json({ success: false, message: "راه‌اندازی تلفن سازمانی ناموفق بود" }, { status: 500 });
  }
}
