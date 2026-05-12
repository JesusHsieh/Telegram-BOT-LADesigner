import "dotenv/config";
import { env } from "../utils/env.js";

const publicUrl = process.argv[2];

if (!publicUrl) {
  console.error("Usage: npm run set-webhook -- https://your-public-domain.com");
  process.exit(1);
}

const webhookUrl = `${publicUrl.replace(/\/$/, "")}/telegram/webhook`;
const response = await fetch(`https://api.telegram.org/bot${env.telegramBotToken}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url: webhookUrl,
    secret_token: env.telegramWebhookSecret
  })
});

const result = await response.json();

if (!response.ok) {
  console.error("Failed to set Telegram webhook:");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(`Telegram webhook set to: ${webhookUrl}`);
console.log(JSON.stringify(result, null, 2));
