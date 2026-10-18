import crypto from "crypto";
import { isValidObjectId } from "mongoose";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import PhoneCall from "@/models/phoneCalls";
import PhoneDevice from "@/models/phoneDevices";
import PhoneSettings from "@/models/phoneSettings";
import Ticket from "@/models/tickets";
import User from "@/models/users";
import { canUsePhone, customerHasSecureCall } from "@/lib/phoneAccess";
import { maskPhone } from "@/lib/phoneCrypto";
import { adminDialNumber, originateAdminCall, originateCustomerCall } from "@/lib/issabelAmi";

function cleanReport(report = {}) {
  return {
    issue: String(report.issue || "").trim(),
    customerRequests: String(report.customerRequests || "").trim(),
    actions: String(report.actions || "").trim(),
    result: String(report.result || "").trim(),
    outcome: ["unknown", "resolved", "follow_up", "unresolved"].includes(report.outcome) ? report.outcome : "unknown",
    satisfaction: [1, 2, 3, 4, 5].includes(Number(report.satisfaction)) ? Number(report.satisfaction) : null,
    notes: String(report.notes || "").trim(),
    completedAt: new Date(),
  };
}

function safeDisplayName(value) {
  const text = String(value || "").trim();
  return !text || /\d{6,}/.test(text) ? "مشتری سازمانی" : text.slice(0, 120);
}

export async function POST(req) {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    if (!canUsePhone(user)) return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
    const body = await req.json();

    if (body.action === "admin-dial") {
      if (user.role !== "admin") return Response.json({ success: false, message: "شماره‌گیری آزاد فقط برای مدیر سیستم مجاز است" }, { status: 403 });
      const number = String(body.number || "").trim();
      try { adminDialNumber(number); }
      catch (error) { return Response.json({ success: false, message: error.message }, { status: 400 }); }
      const device = body.deviceId ? await PhoneDevice.findOne({ user: user._id, deviceId: body.deviceId, status: "active" }).select("_id sipUsername") : null;
      if (!device?.sipUsername) return Response.json({ success: false, message: "ابتدا دستگاه تلفن مدیر را تأیید و متصل کنید" }, { status: 403 });
      const callId = crypto.randomUUID();
      const call = await PhoneCall.create({
        callId, agent: user._id, device: device._id, direction: "outbound", status: "initiated",
        customerDisplayName: `تماس آزاد مدیر · ${maskPhone(number)}`, maskedTarget: maskPhone(number),
      });
      try {
        const settings = await PhoneSettings.findOne({ key: "default" }).select("recordingEnabled").lean();
        await originateAdminCall({ deviceEndpoint: device.sipUsername, phoneNumber: number, callId, recordingEnabled: settings?.recordingEnabled !== false });
      } catch (error) {
        call.status = "failed"; call.endedAt = new Date(); await call.save(); throw error;
      }
      return Response.json({ success: true, message: "ابتدا تلفن وب مدیر زنگ می‌خورد و پس از پاسخ، شماره مقصد گرفته می‌شود", callId });
    }

    if (body.action === "customer-call") {
      if (!isValidObjectId(body.ticketId) || !isValidObjectId(body.customerId)) return Response.json({ success: false, message: "مخاطب یا تیکت معتبر نیست" }, { status: 400 });
      const ticket = await Ticket.findOne({
        _id: body.ticketId,
        creator: body.customerId,
        ...(user.role === "admin" ? {} : { assignedTo: user._id }),
        status: { $ne: "closed" },
      });
      if (!ticket || !(await customerHasSecureCall(body.customerId))) return Response.json({ success: false, message: "تماس امن برای این مشتری مجاز نیست" }, { status: 403 });
      if (!user.pbxExtension) return Response.json({ success: false, message: "داخلی تلفن برای حساب شما تعریف نشده است" }, { status: 422 });
      const customer = await User.findById(body.customerId).select("name phone").lean();
      if (!customer?.phone) return Response.json({ success: false, message: "شماره مشتری ثبت نشده است" }, { status: 422 });
      const device = body.deviceId ? await PhoneDevice.findOne({ user: user._id, deviceId: body.deviceId, status: "active" }).select("_id sipUsername") : null;
      if (!device?.sipUsername) return Response.json({ success: false, message: "این دستگاه هنوز برای تماس تأیید نشده است" }, { status: 403 });
      const callId = crypto.randomUUID();
      const call = await PhoneCall.create({
        callId, agent: user._id, customer: customer._id, ticket: ticket._id, device: device?._id,
        direction: "outbound", status: "initiated", customerDisplayName: customer.name || "مشتری", maskedTarget: maskPhone(customer.phone),
      });
      try {
        const settings = await PhoneSettings.findOne({ key: "default" }).select("recordingEnabled").lean();
        await originateCustomerCall({ extension: user.pbxExtension, customerPhone: customer.phone, deviceEndpoint: device.sipUsername, callId, recordingEnabled: settings?.recordingEnabled !== false });
        ticket.lastPhoneCallAt = new Date(); ticket.lastPhoneCallBy = user._id; await ticket.save();
      } catch (error) {
        call.status = "failed"; call.endedAt = new Date(); await call.save(); throw error;
      }
      return Response.json({ success: true, message: "ابتدا تلفن سازمانی شما زنگ می‌خورد و سپس مشتری متصل می‌شود", callId });
    }

    if (body.action === "session-event") {
      const callId = String(body.callId || crypto.randomUUID());
      let call = await PhoneCall.findOne({ $or: [{ callId }, { sipCallId: callId }] });
      if (!call && body.direction === "inbound") {
        call = await PhoneCall.findOne({
          agent: user._id, direction: "inbound", status: "ringing",
          customerDisplayName: safeDisplayName(body.displayName),
          startedAt: { $gte: new Date(Date.now() - 90000) },
          sipCallId: { $in: ["", null] },
        }).sort({ startedAt: -1 });
        if (call) call.sipCallId = callId;
      }
      if (!call) call = await PhoneCall.create({ callId, agent: user._id, direction: ["inbound", "internal"].includes(body.direction) ? body.direction : "internal", status: "ringing", customerDisplayName: safeDisplayName(body.displayName) });
      if (call.agent.toString() !== user._id.toString() && user.role !== "admin") return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
      const terminal = ["completed", "missed", "rejected", "failed"];
      if (terminal.includes(call.status)) return Response.json({ success: true, callId: call.callId });
      if (body.status === "answered") call.status = "answered";
      else if (terminal.includes(body.status)) call.status = body.status;
      if (body.status === "answered" && !call.answeredAt) call.answeredAt = new Date();
      if (terminal.includes(body.status)) {
        call.endedAt = new Date();
        call.durationSeconds = call.answeredAt ? Math.max(0, Math.round((call.endedAt - call.answeredAt) / 1000)) : 0;
      }
      await call.save();
      return Response.json({ success: true, callId: call.callId });
    }
    return Response.json({ success: false, message: "عملیات تماس معتبر نیست" }, { status: 400 });
  } catch (error) {
    console.error("PHONE CALL POST ERROR", error);
    return Response.json({ success: false, message: error?.message || "شروع تماس ناموفق بود" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    if (!canUsePhone(user)) return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
    const body = await req.json();
    const call = await PhoneCall.findOne({ callId: String(body.callId || "") });
    if (!call) return Response.json({ success: false, message: "تماس پیدا نشد" }, { status: 404 });
    if (user.role !== "admin" && call.agent.toString() !== user._id.toString()) return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
    call.report = cleanReport(body.report);
    await call.save();
    return Response.json({ success: true, message: "گزارش مکالمه ثبت شد" });
  } catch (error) {
    console.error("PHONE CALL PATCH ERROR", error);
    return Response.json({ success: false, message: "ثبت گزارش تماس ناموفق بود" }, { status: 500 });
  }
}
