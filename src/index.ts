import "dotenv/config";
import { createServer } from "node:http";
import { env } from "./utils/env.js";
import { logger } from "./utils/logger.js";
import { handleTelegramUpdate, sendTelegramMessage } from "./telegram/bot.js";

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: "landscape-tg-copilot" }));
      return;
    }

    if (req.method === "POST" && req.url === "/telegram/webhook") {
      const secret = req.headers["x-telegram-bot-api-secret-token"];
      if (env.telegramWebhookSecret && secret !== env.telegramWebhookSecret) {
        res.writeHead(401, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "invalid webhook secret" }));
        return;
      }

      const body = await readRequestBody(req);
      const update = JSON.parse(body);
      await handleTelegramUpdate(update);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === "POST" && req.url === "/telegram/test") {
      const body = JSON.parse(await readRequestBody(req));
      const chatId = Number(body.chatId);
      const text = String(body.text ?? "/help");
      if (!chatId) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "chatId is required" }));
        return;
      }
      await sendTelegramMessage(chatId, text);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "not found" }));
  } catch (error) {
    logger.error("Unhandled request error", error);
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "internal server error" }));
  }
});

server.listen(env.port, () => {
  logger.info(`Landscape TG Copilot listening on port ${env.port}`);
});

function readRequestBody(req: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}
