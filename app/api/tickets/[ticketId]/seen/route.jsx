import { isValidObjectId } from "mongoose";
import Ticket from "@/models/tickets";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import User from "@/models/users";
import { messengerUserSelect, sendMessengerNotification } from "@/utils/messenger";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatTehranDate(value) {
  return new Intl.DateTimeFormat("fa-IR-u-nu-latn", {
    timeZone: "Asia/Tehran",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export async function POST(_req, { params }) {
  try {
    const { ticketId } = await params;
    const user = await getCurrentUser();
    if (!user) return Response.json({ success: false }, { status: 401 });
    if (user.role !== "agent" || !isValidObjectId(ticketId)) {
      return Response.json({ success: false }, { status: 403 });
    }

    await ConnectDb();
    const ticket = await Ticket.findOneAndUpdate(
      { _id: ticketId, assignedTo: user._id, agentViewedAt: null },
      { $set: { agentViewedAt: new Date() } },
      { new: true },
    );
    if (ticket?.agentViewedAt) {
      const admins = await User.find({ role: "admin" }).select(
        `name ${messengerUserSelect}`,
      );
      const notificationText = [
        "👁 <b>تیکت توسط پشتیبان مشاهده شد</b>",
        "",
        `👤 پشتیبان: <b>${escapeHtml(user.name || "پشتیبان")}</b>`,
        `🎫 شماره تیکت: <b>${escapeHtml(ticket.ticketNumber || ticket._id)}</b>`,
        `📌 عنوان: ${escapeHtml(ticket.title)}`,
        `🗓 تاریخ و ساعت مشاهده: <b>${escapeHtml(formatTehranDate(ticket.agentViewedAt))}</b>`,
      ].join("\n");
      await Promise.all(
        admins.map((admin) => sendMessengerNotification(admin, notificationText)),
      );
    }
    return Response.json({ success: true, viewedAt: ticket?.agentViewedAt || null });
  } catch (error) {
    console.error("MARK TICKET SEEN ERROR:", error);
    return Response.json({ success: false }, { status: 500 });
  }
}
