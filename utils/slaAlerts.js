import Ticket from "@/models/tickets";
import User from "@/models/users";
import ConnectDb from "@/utils/connectDB";
import { messengerUserSelect, sendMessengerNotification } from "@/utils/messenger";
import { getSlaStatus } from "@/lib/slaPolicy.mjs";

const HALF_HOUR = 30 * 60 * 1000;
const ALERTS = [
  { id: "responseWarning", field: "slaAlerts.responseWarningAt", due: "responseDueAt", actual: "slaFirstResponseAt", text: "مهلت اولین پاسخ در حال پایان است", kind: "warning" },
  { id: "resolutionWarning", field: "slaAlerts.resolutionWarningAt", due: "resolveDueAt", actual: "resolvedAt", text: "مهلت رفع مشکل در حال پایان است", kind: "warning" },
  { id: "responseBreach", field: "slaAlerts.responseBreachAt", due: "responseDueAt", actual: "slaFirstResponseAt", text: "زمان مجاز اولین پاسخ نقض شده است", kind: "breach" },
  { id: "resolutionBreach", field: "slaAlerts.resolutionBreachAt", due: "resolveDueAt", actual: "resolvedAt", text: "زمان مجاز رفع مشکل نقض شده است", kind: "breach" },
];
function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
export function shouldSendSlaAlert(ticket, alert, now) {
  const due = new Date(ticket.sla?.[alert.due]).getTime();
  const current = new Date(now).getTime();
  if (!Number.isFinite(due) || !Number.isFinite(current) || !ticket.sla?.responseDueAt || !ticket.sla?.resolveDueAt) return false;
  if (ticket.status === "closed" || ticket.status === "resolved") return false;
  const responseActual = alert.actual === "slaFirstResponseAt" ? (ticket.slaFirstResponseAt || ticket.agentFirstReplyAt) : ticket[alert.actual];
  const actualAt = responseActual && new Date(responseActual).getTime();
  if (actualAt && Number.isFinite(actualAt)) return false;
  const pending = getSlaStatus(ticket.sla, ticket, now);
  if (!pending) return false;
  if (alert.kind === "warning") return current < due && current >= due - HALF_HOUR;
  return current > due;
}
export async function processSlaAlerts(now = new Date()) {
  // Default off: no unexpected notifications when the new code is deployed.
  if (process.env.SLA_ALERTS_ENABLED !== "true") return { enabled: false, checked: 0, sent: 0 };
  await ConnectDb();
  const tickets = await Ticket.find({
    "sla.responseDueAt": { $exists: true, $ne: null },
    status: { $in: ["open", "in-progress"] },
  }).select("title ticketNumber status assignedTo agentFirstReplyAt slaFirstResponseAt resolvedAt sla slaAlerts");
  const admins = await User.find({ role: "admin" }).select(`name ${messengerUserSelect}`);
  let sent = 0;
  for (const ticket of tickets) {
    const agent = ticket.assignedTo ? await User.findById(ticket.assignedTo).select(`name ${messengerUserSelect}`) : null;
    for (const alert of ALERTS) {
      if (!shouldSendSlaAlert(ticket, alert, now)) continue;
      const claimed = await Ticket.findOneAndUpdate(
        { _id: ticket._id, status: { $in: ["open", "in-progress"] }, [alert.actual]: null, ...(alert.actual === "slaFirstResponseAt" ? { agentFirstReplyAt: null } : {}), [alert.field]: null },
        { $set: { [alert.field]: now } },
        { new: false },
      );
      if (!claimed) continue;
      const recipients = [agent, ...admins].filter(Boolean);
      const uniqueRecipients = [...new Map(recipients.map((user) => [String(user._id), user])).values()];
      const text = [
        alert.kind === "breach" ? "🚨 <b>نقض تعهد SLA</b>" : "⏰ <b>هشدار SLA</b>",
        escapeHtml(alert.text),
        `🎫 تیکت: <b>${escapeHtml(ticket.ticketNumber || ticket._id)}</b>`,
        `📌 ${escapeHtml(ticket.title)}`,
        `⏳ سررسید: ${new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", dateStyle: "short", timeStyle: "short" }).format(new Date(ticket.sla[alert.due]))}`,
      ].join("\n");
      try {
        const outcomes = await Promise.allSettled(uniqueRecipients.map((user) => sendMessengerNotification(user, text)));
        const delivered = outcomes.some((outcome) => outcome.status === "fulfilled" && outcome.value?.sent);
        if (delivered) sent += 1;
        else await Ticket.updateOne({ _id: ticket._id, [alert.field]: now }, { $unset: { [alert.field]: "" } });
      } catch (error) {
        await Ticket.updateOne({ _id: ticket._id, [alert.field]: now }, { $unset: { [alert.field]: "" } });
        console.error("SLA_ALERT_SEND_ERROR", error);
      }
    }
  }
  return { enabled: true, checked: tickets.length, sent };
}
