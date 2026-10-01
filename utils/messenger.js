import { sendBaleMessage } from "@/utils/bale";
import { sendTelegramMessage } from "@/utils/telegram";
import { sendNotificationSms } from "@/utils/notificationSms";

export const messengerUserSelect =
  "phone role +telegramChatId +baleChatId +preferredMessenger";

export async function sendBotNotification(user, text) {
  if (!user) return { sent: false, reason: "no-user" };

  if (user.preferredMessenger === "bale" && user.baleChatId) {
    return sendBaleMessage(user.baleChatId, text);
  }
  if (user.preferredMessenger === "telegram" && user.telegramChatId) {
    return sendTelegramMessage(user.telegramChatId, text);
  }
  if (user.baleChatId) return sendBaleMessage(user.baleChatId, text);
  if (user.telegramChatId) return sendTelegramMessage(user.telegramChatId, text);
  return { sent: false, reason: "not-linked" };
}

export async function sendMessengerNotification(user, text) {
  if (!user) return { sent: false, reason: "no-user" };

  const [messenger, sms] = await Promise.all([
    sendBotNotification(user, text),
    ["admin", "agent"].includes(user.role)
      ? sendNotificationSms(user.phone, text)
      : Promise.resolve({ sent: false, reason: "role-not-enabled" }),
  ]);
  return { sent: messenger.sent || sms.sent, messenger, sms };
}
