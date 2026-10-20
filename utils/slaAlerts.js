import Ticket from "@/models/tickets";
import User from "@/models/users";
import ConnectDb from "@/utils/connectDB";
import { messengerUserSelect, sendMessengerNotification } from "@/utils/messenger";
import { SLA_ALERT_TYPES, shouldSendSlaAlert, deliverAlertWithClaim } from "@/lib/slaAlertDelivery.mjs";

const ALERTS = SLA_ALERT_TYPES.map(a=>({...a,text:({
responseWarning:"مهلت اولین پاسخ در حال پایان است",
resolutionWarning:"مهلت رفع مشکل در حال پایان است",
responseBreach:"زمان مجاز اولین پاسخ نقض شده است",
resolutionBreach:"زمان مجاز رفع مشکل نقض شده است",
})[a.id]}));
function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
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
      const recipients = [agent, ...admins].filter(Boolean);
      const text = [
        alert.kind === "breach" ? "🚨 <b>نقض تعهد SLA</b>" : "⏰ <b>هشدار SLA</b>",
        escapeHtml(alert.text),
        `🎫 تیکت: <b>${escapeHtml(ticket.ticketNumber || ticket._id)}</b>`,
        `📌 ${escapeHtml(ticket.title)}`,
        `⏳ سررسید: ${new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", dateStyle: "short", timeStyle: "short" }).format(new Date(ticket.sla[alert.due]))}`,
      ].join("\n");
      const outcome = await deliverAlertWithClaim({
        ticket, alert, now, recipients, text, send: sendMessengerNotification,
        claim: (item, event, at) => Ticket.findOneAndUpdate(
          { _id: item._id, status: { $in: ["open", "in-progress"] }, [event.actual]: null,
            ...(event.actual === "slaFirstResponseAt" ? {agentFirstReplyAt:null}:{}),
            [event.field]: null },
          { $set: {[event.field]:at} }, {new:false}),
        release: (item,event,at) => Ticket.updateOne(
          {_id:item._id,[event.field]:at}, {$unset:{[event.field]:""}}),
      });
      if(outcome.sent)sent += 1;
    }
  }
  return { enabled: true, checked: tickets.length, sent };
}
