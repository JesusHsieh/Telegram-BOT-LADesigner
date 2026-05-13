import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";
import { canUseBot, getAccessRole, type TelegramUserContext } from "../security/accessControl.js";
import { handleCommand } from "./commands.js";
import type { TelegramUpdate } from "./types.js";

const telegramApiBase = `https://api.telegram.org/bot${env.telegramBotToken}`;

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message) return;

  const user: TelegramUserContext = {
    id: message.from?.id,
    username: message.from?.username,
    firstName: message.from?.first_name
  };

  logger.info("Incoming Telegram message", {
    chatId: message.chat.id,
    userId: user.id,
    username: user.username,
    firstName: user.firstName,
    role: getAccessRole(user),
    messageId: message.message_id,
    textPreview: redactMessageText(message.text ?? message.caption)
  });

  if (!canUseBot(user)) {
    logger.warn("Rejected unauthorized Telegram user", {
      userId: user.id,
      username: user.username,
      firstName: user.firstName,
      hint: "Set TELEGRAM_OWNER_ID or add this user id through /auth add if access should be allowed."
    });
    await sendTelegramMessage(
      message.chat.id,
      [
        "你的帳號目前未被授權使用此 Bot。",
        "",
        user.id ? `你的 Telegram user id 是：${user.id}` : "目前無法讀取你的 Telegram user id。",
        "如需開通，請將此 user id 提供給系統擁有者加入授權清單。"
      ].join("\n")
    );
    return;
  }

  const text = message.text ?? message.caption;
  if (!text) {
    await sendTelegramMessage(message.chat.id, "目前只支援文字指令。檔案、圖片與 PDF 讀取會在後續工具階段開放。");
    return;
  }

  const reply = await handleCommand(text, user);
  await sendTelegramMessage(message.chat.id, reply);
}

export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const chunks = splitTelegramMessage(text);
  for (const chunk of chunks) {
    await callTelegramApi("sendMessage", {
      chat_id: chatId,
      text: chunk,
      disable_web_page_preview: true
    });
  }
}

export async function getTelegramUpdates(offset?: number): Promise<TelegramUpdate[]> {
  const result = await callTelegramApi("getUpdates", {
    offset,
    timeout: 25,
    allowed_updates: ["message"]
  });
  return result as TelegramUpdate[];
}

export async function getTelegramWebhookInfo(): Promise<{ url?: string; pending_update_count?: number }> {
  return (await callTelegramApi("getWebhookInfo", {})) as { url?: string; pending_update_count?: number };
}

export async function deleteTelegramWebhook(dropPendingUpdates = false): Promise<void> {
  await callTelegramApi("deleteWebhook", {
    drop_pending_updates: dropPendingUpdates
  });
}

async function callTelegramApi(method: string, payload: Record<string, unknown>): Promise<unknown> {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${telegramApiBase}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      const body = await response.json().catch(() => undefined);
      if (!response.ok) {
        throw new Error(`Telegram ${method} failed: ${response.status} ${JSON.stringify(body)}`);
      }

      if (!body || typeof body !== "object" || !("ok" in body) || body.ok !== true) {
        throw new Error(`Telegram ${method} returned unexpected body: ${JSON.stringify(body)}`);
      }

      return "result" in body ? body.result : undefined;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(1000 * attempt);
      }
    }
  }

  throw lastError;
}

function splitTelegramMessage(text: string): string[] {
  const maxLength = 3500;
  if (text.length <= maxLength) return [text];

  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > maxLength) {
    const cutAt = remaining.lastIndexOf("\n", maxLength);
    const index = cutAt > 500 ? cutAt : maxLength;
    parts.push(remaining.slice(0, index));
    remaining = remaining.slice(index).trimStart();
  }
  if (remaining) parts.push(remaining);
  return parts;
}

function redactMessageText(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 160) return normalized;
  return `${normalized.slice(0, 160)}...[truncated:${normalized.length}]`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
