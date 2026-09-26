import { sendBaleMessage } from "@/utils/bale";
import { sendTelegramMessage } from "@/utils/telegram";

export const messengerUserSelect =
  "+telegramChatId +baleChatId +preferredMessenger";

export async function sendMessengerNotification(user, text) {
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
