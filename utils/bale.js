export async function sendBaleMessage(chatId, text) {
  const token = process.env.BALE_BOT_TOKEN;
  if (!token || !chatId) return { sent: false, reason: "not-configured" };

  try {
    const response = await fetch(
      `https://tapi.bale.ai/bot${token}/sendMessage`,
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
      console.log("BALE SEND ERROR:", await response.text());
      return { sent: false, reason: "bale-error" };
    }
    return { sent: true };
  } catch (error) {
    console.log("BALE SEND ERROR:", error.message);
    return { sent: false, reason: "network-error" };
  }
}
