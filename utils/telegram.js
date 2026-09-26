function escapeTelegramHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function isSiteOffline(user, now = Date.now()) {
  if (!user?.siteLastSeenAt) return true;
  return now - new Date(user.siteLastSeenAt).getTime() > 90 * 1000;
}

export async function sendTelegramMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return { sent: false, reason: "not-configured" };

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      },
    );
    if (!response.ok) {
      console.log("TELEGRAM SEND ERROR:", await response.text());
      return { sent: false, reason: "telegram-error" };
    }
    return { sent: true };
  } catch (error) {
    console.log("TELEGRAM SEND ERROR:", error.message);
    return { sent: false, reason: "network-error" };
  }
}

export function assignmentTelegramText({ ticket, projectName }) {
  return [
    "🎫 <b>تیکت جدیدی به شما اختصاص داده شد</b>",
    "",
    `🔢 شماره تیکت: <b>${escapeTelegramHtml(ticket.ticketNumber || "در انتظار شماره")}</b>`,
    `📌 عنوان: ${escapeTelegramHtml(ticket.title)}`,
    `📁 خدمت: ${escapeTelegramHtml(projectName || "بدون خدمت")}`,
    "📌 برای مشاهده جزئیات و گفت‌وگو وارد سامانه شوید.",
  ].join("\n");
}

export function customerMessageTelegramText({ ticket, message, customerName, serviceName }) {
  return [
    "💬 <b>پیام جدید از مشتری</b>",
    "",
    `🎫 تیکت: <b>${escapeTelegramHtml(ticket.ticketNumber || ticket._id)}</b>`,
    `📌 عنوان: ${escapeTelegramHtml(ticket.title)}`,
    `📁 خدمت: ${escapeTelegramHtml(serviceName || "بدون خدمت")}`,
    `👤 مشتری: ${escapeTelegramHtml(customerName || "مشتری")}`,
    `✉️ پیام: ${escapeTelegramHtml(message.slice(0, 1000))}`,
  ].join("\n");
}

export function ticketReplyTelegramText({
  ticket,
  message,
  senderName,
  senderRole,
  serviceName,
}) {
  const normalizedMessage = String(message).replace(/\s+/g, " ").trim();
  const preview = normalizedMessage.length > 120
    ? `${normalizedMessage.slice(0, 120)}…`
    : normalizedMessage;
  return [
    `💬 <b>پیام جدید از ${escapeTelegramHtml(senderRole)}</b>`,
    "",
    `🎫 شماره تیکت: <b>${escapeTelegramHtml(ticket.ticketNumber || ticket._id)}</b>`,
    `📌 عنوان: ${escapeTelegramHtml(ticket.title)}`,
    `📁 خدمت: ${escapeTelegramHtml(serviceName || "بدون خدمت")}`,
    `👤 فرستنده: ${escapeTelegramHtml(senderName || senderRole)}`,
    `✉️ بخشی از پیام: ${escapeTelegramHtml(preview)}`,
    "",
    "برای مشاهده متن کامل و پاسخ‌دادن وارد سامانه شوید.",
  ].join("\n");
}
