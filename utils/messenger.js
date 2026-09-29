import { sendBaleMessage } from "@/utils/bale";
import { sendTelegramMessage } from "@/utils/telegram";
import { sendNotificationSms } from "@/utils/notificationSms";

export const messengerUserSelect =
  "phone role +telegramChatId +baleChatId +preferredMessenger";

export async function sendMessengerNotification(user, text) {
  if (!user) return { sent: false, reason: "no-user" };

  const smsPromise = ["admin", "agent"].includes(user.role)
    ? sendNotificationSms(user.phone, text)
    : Promise.resolve({ sent: false, reason: "role-not-enabled" });
  let messengerPromise;
  if (user.preferredMessenger === "bale" && user.baleChatId) {
    messengerPromise = sendBaleMessage(user.baleChatId, text);
  } else if (user.preferredMessenger === "telegram" && user.telegramChatId) {
    messengerPromise = sendTelegramMessage(user.telegramChatId, text);
  } else if (user.baleChatId) {
    messengerPromise = sendBaleMessage(user.baleChatId, text);
  } else if (user.telegramChatId) {
    messengerPromise = sendTelegramMessage(user.telegramChatId, text);
  } else {
    messengerPromise = Promise.resolve({ sent: false, reason: "not-linked" });
  }

  const [messenger, sms] = await Promise.all([messengerPromise, smsPromise]);
  return { sent: messenger.sent || sms.sent, messenger, sms };
}
