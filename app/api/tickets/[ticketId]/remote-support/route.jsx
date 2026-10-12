import { isValidObjectId } from "mongoose";
import RemoteSupportSession from "@/models/remoteSupportSession";
import Ticket from "@/models/tickets";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";

const ACTIVE_STATUSES = ["requested", "approved"];
const SESSION_MINUTES = 30;

function isTicketMember(ticket, user) {
  if (user.role === "admin") return true;
  if (user.role === "agent") return ticket.assignedTo?.toString() === user._id.toString();
  if (user.role === "customer") return ticket.creator?.toString() === user._id.toString();
  return false;
}

function publicSession(session) {
  if (!session) return null;
  return {
    _id: session._id,
    status: session.status,
    requestNote: session.requestNote,
    requestedAt: session.requestedAt,
    customerApprovedAt: session.customerApprovedAt,
    endedAt: session.endedAt,
    expiresAt: session.expiresAt,
    requestedBy: session.requestedBy?.name || "پشتیبان",
  };
}

async function loadTicketAndUser(ticketId) {
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ success: false, message: "برای ادامه وارد حساب شوید." }, { status: 401 }) };
  if (!isValidObjectId(ticketId)) return { error: Response.json({ success: false, message: "شناسه تیکت معتبر نیست." }, { status: 400 }) };
  await ConnectDb();
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return { error: Response.json({ success: false, message: "تیکت پیدا نشد." }, { status: 404 }) };
  if (!isTicketMember(ticket, user)) return { error: Response.json({ success: false, message: "اجازه دسترسی به این تیکت را ندارید." }, { status: 403 }) };
  return { user, ticket };
}

async function expireIfNeeded(session) {
  if (session && ACTIVE_STATUSES.includes(session.status) && session.expiresAt <= new Date()) {
    session.status = "expired";
    session.endedAt = new Date();
    await session.save();
  }
  return session;
}

export async function GET(_req, { params }) {
  const { ticketId } = await params;
  try {
    const { user, ticket, error } = await loadTicketAndUser(ticketId);
    if (error) return error;
    const session = await expireIfNeeded(
      await RemoteSupportSession.findOne({ ticket: ticket._id })
        .populate("requestedBy", "name")
        .sort({ createdAt: -1 }),
    );
    return Response.json({
      success: true,
      session: publicSession(session),
      canRequest: ["admin", "agent"].includes(user.role) && ticket.status !== "closed",
      canApprove: user.role === "customer" && session?.status === "requested",
      canOpenConsole: ["admin", "agent"].includes(user.role) && session?.status === "approved",
      remoteConsoleUrl: process.env.NEXT_PUBLIC_REMOTE_SUPPORT_URL || "https://remote.itrasam.com",
    });
  } catch (error) {
    console.error("REMOTE SUPPORT GET ERROR", error);
    return Response.json({ success: false, message: "دریافت وضعیت دسترسی از راه دور ناموفق بود." }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const { ticketId } = await params;
  try {
    const { user, ticket, error } = await loadTicketAndUser(ticketId);
    if (error) return error;
    if (!["admin", "agent"].includes(user.role) || ticket.status === "closed") {
      return Response.json({ success: false, message: "امکان درخواست دسترسی برای این تیکت وجود ندارد." }, { status: 403 });
    }
    const body = await req.json();
    const requestNote = String(body?.requestNote || "").trim().slice(0, 1000);
    const existing = await expireIfNeeded(await RemoteSupportSession.findOne({ ticket: ticket._id, status: { $in: ACTIVE_STATUSES } }).sort({ createdAt: -1 }));
    if (existing?.status && ACTIVE_STATUSES.includes(existing.status)) {
      return Response.json({ success: false, message: "یک درخواست دسترسی فعال برای این تیکت وجود دارد." }, { status: 409 });
    }
    const session = await RemoteSupportSession.create({
      ticket: ticket._id,
      requestedBy: user._id,
      requestNote,
      expiresAt: new Date(Date.now() + SESSION_MINUTES * 60 * 1000),
    });
    await session.populate("requestedBy", "name");
    return Response.json({ success: true, message: "درخواست دسترسی برای مشتری ارسال شد.", session: publicSession(session) }, { status: 201 });
  } catch (error) {
    console.error("REMOTE SUPPORT POST ERROR", error);
    return Response.json({ success: false, message: "ایجاد درخواست دسترسی ناموفق بود." }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const { ticketId } = await params;
  try {
    const { user, ticket, error } = await loadTicketAndUser(ticketId);
    if (error) return error;
    const { action } = await req.json();
    const session = await expireIfNeeded(await RemoteSupportSession.findOne({ ticket: ticket._id, status: { $in: ACTIVE_STATUSES } }).sort({ createdAt: -1 }));
    if (!session || !ACTIVE_STATUSES.includes(session.status)) {
      return Response.json({ success: false, message: "نشست فعال دسترسی از راه دوری وجود ندارد." }, { status: 404 });
    }

    if (action === "approve" && user.role === "customer" && session.status === "requested") {
      session.status = "approved";
      session.customerApprovedAt = new Date();
      session.expiresAt = new Date(Date.now() + SESSION_MINUTES * 60 * 1000);
      await session.save();
      await session.populate("requestedBy", "name");
      return Response.json({ success: true, message: "دسترسی برای ۳۰ دقیقه تأیید شد.", session: publicSession(session) });
    }

    if (action === "decline" && user.role === "customer" && session.status === "requested") {
      session.status = "declined";
      session.endedAt = new Date();
      session.endedBy = user._id;
      await session.save();
      return Response.json({ success: true, message: "درخواست دسترسی رد شد.", session: publicSession(session) });
    }

    if (action === "end" && ["admin", "agent", "customer"].includes(user.role)) {
      session.status = "ended";
      session.endedAt = new Date();
      session.endedBy = user._id;
      await session.save();
      return Response.json({ success: true, message: "نشست دسترسی از راه دور پایان یافت.", session: publicSession(session) });
    }
    return Response.json({ success: false, message: "این عملیات مجاز نیست." }, { status: 403 });
  } catch (error) {
    console.error("REMOTE SUPPORT PATCH ERROR", error);
    return Response.json({ success: false, message: "به‌روزرسانی دسترسی از راه دور ناموفق بود." }, { status: 500 });
  }
}
