import { readFile } from "fs/promises";

const envText = await readFile(new URL("../.env", import.meta.url), "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((line) => line && !line.trimStart().startsWith("#") && line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }),
);

const botToken = env.TELEGRAM_BOT_TOKEN;
const webhookSecret = env.TELEGRAM_WEBHOOK_SECRET;
if (!botToken || !webhookSecret) {
  throw new Error("Telegram environment variables are missing");
}

let offset = 0;
console.log("Telegram local polling started");

while (true) {
  try {
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getUpdates?timeout=25&offset=${offset}`,
    );
    const telegramData = await telegramResponse.json();
    if (!telegramData.ok) throw new Error(telegramData.description || "getUpdates failed");

    for (const update of telegramData.result) {
      offset = update.update_id + 1;
      const localResponse = await fetch("http://127.0.0.1:3000/api/telegram/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": webhookSecret,
        },
        body: JSON.stringify(update),
      });
      console.log(`Processed Telegram update ${update.update_id}: ${localResponse.status}`);
    }
  } catch (error) {
    console.error("Telegram polling error:", error.message);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}
