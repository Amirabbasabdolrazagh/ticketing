import { forceRtlLines, htmlToBaleMarkdown } from "@/utils/messageFormatting";

export async function sendBaleMessage(chatId, text) {
  const token = process.env.BALE_BOT_TOKEN;
  if (!token || !chatId) return { sent: false, reason: "not-configured" };

  try {
    const url = `https://tapi.bale.ai/bot${token}/sendMessage`;
    const formattedText = forceRtlLines(htmlToBaleMarkdown(text));
    let response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: formattedText,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      });
    let result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) {
      console.log("BALE FORMATTED SEND ERROR:", response.status, result.description || result.message);
      const plainText = htmlToBaleMarkdown(text)
        .replace(/\\([\\_*`[])/g, "$1")
        .replaceAll("*", "");
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: forceRtlLines(plainText),
          disable_web_page_preview: true,
        }),
      });
      result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) {
        console.log("BALE SEND ERROR:", response.status, result.description || result.message);
        return { sent: false, reason: "bale-error" };
      }
    }
    return { sent: true };
  } catch (error) {
    console.log("BALE SEND ERROR:", error.message);
    return { sent: false, reason: "network-error" };
  }
}
