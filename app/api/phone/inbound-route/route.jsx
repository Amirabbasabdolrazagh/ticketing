import crypto from "crypto";
import ConnectDb from "@/utils/connectDB";
import Ticket from "@/models/tickets";
import User from "@/models/users";
import PhoneCall from "@/models/phoneCalls";
import { customerHasSecureCall } from "@/lib/phoneAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeIranPhone(value) {
  let phone = String(value || "").replace(/\D/g, "");
  if (phone.startsWith("0098")) phone = `0${phone.slice(4)}`;
  else if (phone.startsWith("98")) phone = `0${phone.slice(2)}`;
  if (phone.length === 10 && phone.startsWith("9")) phone = `0${phone}`;
  return /^09\d{9}$/.test(phone) ? phone : "";
}

function verify(raw, signature, timestamp) {
  const secret = process.env.PHONE_INBOUND_ROUTER_SECRET;
  if (!secret || !signature || !timestamp || Math.abs(Date.now() - Number(timestamp) * 1000) > 90000) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(String(signature));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function POST(req) {
  try {
    const raw = await req.text();
    if (!verify(raw, req.headers.get("x-phone-signature"), req.headers.get("x-phone-timestamp"))) {
      return Response.json({ success: false, message: "درخواست معتبر نیست" }, { status: 401 });
    }
    const body = JSON.parse(raw);
    const phone = normalizeIranPhone(body.callerNumber);
    if (!phone) return Response.json({ success: true, matched: false, extension: process.env.ISSABEL_DEFAULT_SUPPORT_EXTENSION || "102" });
    await ConnectDb();
    const customer = await User.findOne({ phone }).select("_id name").lean();
    if (!customer || !(await customerHasSecureCall(customer._id))) {
      return Response.json({ success: true, matched: false, extension: process.env.ISSABEL_DEFAULT_SUPPORT_EXTENSION || "102" });
    }
    const ticket = await Ticket.findOne({ creator: customer._id, status: { $in: ["open", "in-progress", "resolved"] } })
      .sort({ lastPhoneCallAt: -1, updatedAt: -1 })
      .populate("lastPhoneCallBy", "name pbxExtension role")
      .populate("assignedTo", "name pbxExtension role")
      .lean();
    const agent = ticket?.lastPhoneCallBy?.pbxExtension ? ticket.lastPhoneCallBy : ticket?.assignedTo?.pbxExtension ? ticket.assignedTo : null;
    let resolvedAgent = agent;
    if (!resolvedAgent) resolvedAgent = await User.findOne({ pbxExtension: process.env.ISSABEL_DEFAULT_SUPPORT_EXTENSION || "102", role: { $in: ["agent", "active_agent", "passive_agent"] } }).select("name pbxExtension role").lean();
    const extension = resolvedAgent?.pbxExtension || process.env.ISSABEL_DEFAULT_SUPPORT_EXTENSION || "102";
    const callId = /^[A-Za-z0-9_-]{8,100}$/.test(String(body.callId || "")) ? String(body.callId) : crypto.randomUUID();
    if (resolvedAgent) {
      await PhoneCall.findOneAndUpdate({ callId }, { $setOnInsert: {
        agent: resolvedAgent._id, customer: customer._id, ticket: ticket?._id || null,
        direction: "inbound", status: "ringing", customerDisplayName: customer.name || "مشتری سازمانی",
        maskedTarget: "شماره محرمانه", startedAt: new Date(),
      } }, { upsert: true });
    }
    if (ticket) await Ticket.updateOne({ _id: ticket._id }, { $set: { lastCustomerPhoneCallAt: new Date() } });
    return Response.json({
      success: true,
      matched: Boolean(ticket && agent),
      extension,
      customerName: String(customer.name || "مشتری سازمانی").replace(/[\r\n"<>]/g, "").slice(0, 64),
      ticketNumber: ticket?.ticketNumber || "",
      callId,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("PHONE INBOUND ROUTE ERROR", error);
    return Response.json({ success: false, matched: false, extension: process.env.ISSABEL_DEFAULT_SUPPORT_EXTENSION || "102" }, { status: 500 });
  }
}
