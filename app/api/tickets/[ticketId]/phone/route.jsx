import { isValidObjectId } from "mongoose";
import { originateCustomerCall } from "@/lib/issabelAmi";
import Ticket from "@/models/tickets";
import User from "@/models/users";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";

const STAFF_ROLES = ["admin", "agent"];

function isTicketMember(ticket, user) {
  if (user.role === "admin") return true;
  if (user.role === "agent") return ticket.assignedTo?.toString() === user._id.toString();
  if (user.role === "customer") return ticket.creator?.toString() === user._id.toString();
  return false;
}

async function load(ticketId) {
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ success: false, message: "برای ادامه وارد حساب شوید." }, { status: 401 }) };
  if (!isValidObjectId(ticketId)) return { error: Response.json({ success: false, message: "شناسه تیکت معتبر نیست." }, { status: 400 }) };
  await ConnectDb();
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return { error: Response.json({ success: false, message: "تیکت پیدا نشد." }, { status: 404 }) };
  if (!isTicketMember(ticket, user)) return { error: Response.json({ success: false, message: "اجازه دسترسی به این تیکت را ندارید." }, { status: 403 }) };
  return { user, ticket };
}

function publicState(ticket, user) {
  const isStaff = STAFF_ROLES.includes(user.role);
  const isPhoneSystemConfigured = [
    "ISSABEL_AMI_HOST",
    "ISSABEL_AMI_USERNAME",
    "ISSABEL_AMI_SECRET",
    "ISSABEL_COMPANY_CALLER_ID",
  ].every((name) => Boolean(process.env[name]?.trim()));
  return {
    callbackRequestedAt: ticket.callbackRequestedAt,
    callbackRequestedByCustomer: Boolean(ticket.callbackRequestedAt && ticket.callbackRequestedBy?.toString() === ticket.creator?.toString()),
    lastPhoneCallAt: ticket.lastPhoneCallAt,
    canRequestCallback: user.role === "customer" && ticket.status !== "closed",
    canCallCustomer: isStaff && ticket.status !== "closed" && Boolean(user.pbxExtension) && isPhoneSystemConfigured,
    hasPbxExtension: Boolean(user.pbxExtension),
    isPhoneSystemConfigured,
  };
}

export async function GET(_req, { params }) {
  const { ticketId } = await params;
  try {
    const { user, ticket, error } = await load(ticketId);
    if (error) return error;
    return Response.json({ success: true, ...publicState(ticket, user) });
  } catch (error) {
    console.error("TICKET PHONE GET ERROR", error);
    return Response.json({ success: false, message: "دریافت وضعیت تماس ناموفق بود." }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const { ticketId } = await params;
  try {
    const { user, ticket, error } = await load(ticketId);
    if (error) return error;
    const { action } = await req.json();

    if (action === "request-callback") {
      if (user.role !== "customer" || ticket.status === "closed") {
        return Response.json({ success: false, message: "امکان ثبت درخواست تماس وجود ندارد." }, { status: 403 });
      }
      ticket.callbackRequestedAt = new Date();
      ticket.callbackRequestedBy = user._id;
      await ticket.save();
      return Response.json({ success: true, message: "درخواست تماس برای پشتیبان ثبت شد.", ...publicState(ticket, user) });
    }

    if (action === "call-customer") {
      if (!STAFF_ROLES.includes(user.role) || ticket.status === "closed") {
        return Response.json({ success: false, message: "امکان تماس برای این تیکت وجود ندارد." }, { status: 403 });
      }
      if (!user.pbxExtension) {
        return Response.json({ success: false, message: "داخلی تلفن برای حساب شما تعریف نشده است." }, { status: 422 });
      }
      const customer = await User.findById(ticket.creator).select("phone");
      if (!customer?.phone) {
        return Response.json({ success: false, message: "شماره تماس مشتری برای این تیکت ثبت نشده است." }, { status: 422 });
      }
      await originateCustomerCall({ extension: user.pbxExtension, customerPhone: customer.phone });
      ticket.lastPhoneCallAt = new Date();
      ticket.lastPhoneCallBy = user._id;
      ticket.callbackRequestedAt = null;
      ticket.callbackRequestedBy = null;
      await ticket.save();
      return Response.json({ success: true, message: "ابتدا داخلی شما زنگ می‌خورد؛ پس از پاسخ، مشتری متصل می‌شود.", ...publicState(ticket, user) });
    }

    return Response.json({ success: false, message: "عملیات تماس معتبر نیست." }, { status: 400 });
  } catch (error) {
    console.error("TICKET PHONE POST ERROR", error);
    return Response.json({ success: false, message: error?.message || "برقراری تماس ناموفق بود." }, { status: 500 });
  }
}
