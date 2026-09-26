import User from "@/models/users";
import ConnectDb from "@/utils/connectDB";
import { sendBaleMessage } from "@/utils/bale";

export async function POST(req) {
  try {
    const configuredSecret = process.env.BALE_WEBHOOK_SECRET;
    const requestSecret = new URL(req.url).searchParams.get("secret") ||
      req.headers.get("x-bale-bot-api-secret-token");
    if (!configuredSecret) return Response.json({ success: false }, { status: 503 });
    if (requestSecret !== configuredSecret) {
      return Response.json({ success: false }, { status: 403 });
    }

    const update = await req.json();
    const baleMessage = update.message;
    const text = baleMessage?.text || "";
    const match = text.match(/^\/start\s+(.+)$/);
    if (!baleMessage?.chat?.id) return Response.json({ success: true });

    if (!match) {
      if (text.startsWith("/start")) {
        await sendBaleMessage(
          baleMessage.chat.id,
          "برای اتصال حساب، از صفحه تنظیمات سامانه روی «اتصال به بله» بزنید.",
        );
      }
      return Response.json({ success: true });
    }

    await ConnectDb();
    await User.updateMany(
      { baleChatId: String(baleMessage.chat.id) },
      { $unset: { baleChatId: 1, baleUsername: 1, baleLinkedAt: 1 } },
    );
    const user = await User.findOneAndUpdate(
      {
        baleLinkToken: match[1],
        baleLinkExpiresAt: { $gt: new Date() },
        role: { $in: ["admin", "agent", "customer"] },
      },
      {
        $set: {
          baleChatId: String(baleMessage.chat.id),
          baleUsername: baleMessage.from?.username || "",
          baleLinkedAt: new Date(),
          preferredMessenger: "bale",
        },
        $unset: { baleLinkToken: 1, baleLinkExpiresAt: 1 },
      },
      { new: true },
    ).select("+baleChatId");

    if (!user) {
      await sendBaleMessage(
        baleMessage.chat.id,
        "❌ لینک اتصال نامعتبر یا منقضی شده است. از تنظیمات سامانه یک لینک تازه بسازید.",
      );
      return Response.json({ success: true });
    }
    await sendBaleMessage(
      baleMessage.chat.id,
      "✅ حساب بله شما با موفقیت به سامانه تیکت متصل شد.",
    );
    return Response.json({ success: true });
  } catch (error) {
    console.log("BALE WEBHOOK ERROR:", error.message);
    return Response.json({ success: true });
  }
}
