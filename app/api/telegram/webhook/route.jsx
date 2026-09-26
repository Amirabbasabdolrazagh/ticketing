import User from "@/models/users";
import ConnectDb from "@/utils/connectDB";
import { sendTelegramMessage } from "@/utils/telegram";

export async function POST(req) {
  try {
    const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!configuredSecret) {
      return Response.json({ success: false }, { status: 503 });
    }
    if (req.headers.get("x-telegram-bot-api-secret-token") !== configuredSecret) {
      return Response.json({ success: false }, { status: 403 });
    }

    const update = await req.json();
    const telegramMessage = update.message;
    const text = telegramMessage?.text || "";
    const match = text.match(/^\/start\s+(.+)$/);
    if (!telegramMessage?.chat?.id) {
      return Response.json({ success: true });
    }
    if (!match) {
      if (text.startsWith("/start")) {
        await sendTelegramMessage(
          telegramMessage.chat.id,
          "برای اتصال حساب، از صفحه تنظیمات سامانه روی «اتصال حساب تلگرام» بزنید.",
        );
      }
      return Response.json({ success: true });
    }

    await ConnectDb();
    await User.updateMany(
      { telegramChatId: String(telegramMessage.chat.id) },
      { $unset: { telegramChatId: 1, telegramUsername: 1, telegramLinkedAt: 1 } },
    );
    const user = await User.findOneAndUpdate(
      {
        telegramLinkToken: match[1],
        telegramLinkExpiresAt: { $gt: new Date() },
        role: { $in: ["admin", "agent", "customer"] },
      },
      {
        $set: {
          telegramChatId: String(telegramMessage.chat.id),
          telegramUsername: telegramMessage.from?.username || "",
          telegramLinkedAt: new Date(),
        },
        $unset: { telegramLinkToken: 1, telegramLinkExpiresAt: 1 },
      },
      { new: true },
    ).select("+telegramChatId");

    if (!user) {
      await sendTelegramMessage(
        telegramMessage.chat.id,
        "❌ لینک اتصال نامعتبر یا منقضی شده است. از تنظیمات سامانه یک لینک تازه بسازید.",
      );
      return Response.json({ success: true });
    }
    await sendTelegramMessage(
      telegramMessage.chat.id,
      "✅ حساب تلگرام شما با موفقیت به سامانه تیکت متصل شد.",
    );
    return Response.json({ success: true });
  } catch (error) {
    console.log("TELEGRAM WEBHOOK ERROR:", error.message);
    return Response.json({ success: true });
  }
}
