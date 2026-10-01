import { forceRtlLines } from "@/utils/messageFormatting";

const SMS_URL = "https://api.iranpayamak.com/ws/v1/sms/simple";

function toPlainText(html) {
  const text = String(html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.length > 320 ? `${text.slice(0, 317)}...` : text;
}

export async function sendNotificationSms(phone, notificationText) {
  if (!phone || !process.env.OTP_API_KEY) {
    return { sent: false, reason: "not-configured" };
  }

  try {
    const text = forceRtlLines(
      `${toPlainText(notificationText)}\nسامانه پشتیبانی ای تی رسام`,
    );
    const response = await fetch(SMS_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Api-Key": process.env.OTP_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        line_number: process.env.SMS_LINE_NUMBER || "90008361",
        recipients: [phone],
        number_format: "english",
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.status !== "success") {
      console.error("NOTIFICATION SMS ERROR:", response.status, result.messages || result.message);
      return { sent: false, reason: "provider-error" };
    }
    return { sent: true };
  } catch (error) {
    console.error("NOTIFICATION SMS ERROR:", error.message);
    return { sent: false, reason: "network-error" };
  }
}
