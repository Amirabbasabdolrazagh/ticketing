import Ticket from "@/models/tickets";
import User from "@/models/users";
import ConnectDb from "@/utils/connectDB";
import { messengerUserSelect, sendMessengerNotification } from "@/utils/messenger";

const HOUR_MS = 60 * 60 * 1000;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function ticketDetails(ticket) {
  return [
    `🎫 شماره تیکت: <b>${escapeHtml(ticket.ticketNumber || ticket._id)}</b>`,
    `📌 عنوان: ${escapeHtml(ticket.title)}`,
  ].join("\n");
}

async function notifyUsers(users, text) {
  await Promise.all(users.map((user) => sendMessengerNotification(user, text)));
}

export async function processTicketAttentionAlerts(now = new Date()) {
  await ConnectDb();
  const tickets = await Ticket.find({
    assignedTo: { $ne: null },
    status: { $in: ["open", "in-progress"] },
  }).select(
    "title ticketNumber assignedTo assignedAt agentViewedAt agentFirstReplyAt unseenReminder2hSentAt unseenAlarm3hSentAt unseenEscalation4hSentAt createdAt",
  );
  const admins = await User.find({ role: "admin" }).select(
    `name ${messengerUserSelect}`,
  );
  let processed = 0;

  for (const ticket of tickets) {
    const assignedAt = ticket.assignedAt || ticket.createdAt;
    const elapsed = now.getTime() - new Date(assignedAt).getTime();
    const agent = await User.findById(ticket.assignedTo).select(
      `name ${messengerUserSelect}`,
    );
    if (!agent) continue;

    if (!ticket.agentViewedAt && elapsed >= 2 * HOUR_MS && !ticket.unseenReminder2hSentAt) {
      const claimed = await Ticket.findOneAndUpdate(
        { _id: ticket._id, agentViewedAt: null, unseenReminder2hSentAt: null },
        { $set: { unseenReminder2hSentAt: now } },
      );
      if (claimed) {
        await notifyUsers([agent], [
          "⏰ <b>یادآوری مشاهده تیکت</b>",
          "دو ساعت از تخصیص این تیکت گذشته و هنوز آن را مشاهده نکرده‌اید.",
          ticketDetails(ticket),
        ].join("\n\n"));
        processed += 1;
      }
    }

    if (!ticket.agentViewedAt && elapsed >= 3 * HOUR_MS && !ticket.unseenAlarm3hSentAt) {
      const claimed = await Ticket.findOneAndUpdate(
        { _id: ticket._id, agentViewedAt: null, unseenAlarm3hSentAt: null },
        { $set: { unseenAlarm3hSentAt: now } },
      );
      if (claimed) {
        await notifyUsers([agent], [
          "🚨 <b>هشدار تیکت مشاهده‌نشده</b>",
          "سه ساعت از تخصیص تیکت گذشته است. لطفاً فوراً آن را بررسی کنید.",
          ticketDetails(ticket),
        ].join("\n\n"));
        await notifyUsers(admins, [
          "🚨 <b>هشدار مدیریتی</b>",
          `پشتیبان ${escapeHtml(agent.name || "تعیین‌شده")} پس از سه ساعت هنوز تیکت را مشاهده نکرده است.`,
          ticketDetails(ticket),
        ].join("\n\n"));
        processed += 1;
      }
    }

    const needsEscalation = !ticket.agentViewedAt || !ticket.agentFirstReplyAt;
    if (needsEscalation && elapsed >= 4 * HOUR_MS && !ticket.unseenEscalation4hSentAt) {
      const claimed = await Ticket.findOneAndUpdate(
        { _id: ticket._id, unseenEscalation4hSentAt: null },
        { $set: { unseenEscalation4hSentAt: now } },
      );
      if (claimed) {
        const statusText = !ticket.agentViewedAt
          ? "هنوز تیکت را مشاهده نکرده"
          : "تیکت را دیده اما هنوز پاسخی ثبت نکرده";
        await notifyUsers(admins, [
          "🆘 <b>پیگیری فوری تیکت</b>",
          `پشتیبان ${escapeHtml(agent.name || "تعیین‌شده")} پس از چهار ساعت ${statusText} است.`,
          ticketDetails(ticket),
        ].join("\n\n"));
        processed += 1;
      }
    }
  }

  return { processed, checked: tickets.length };
}
