import "dotenv/config";
import { deleteTelegramWebhook, getTelegramUpdates, getTelegramWebhookInfo, handleTelegramUpdate } from "../telegram/bot.js";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";

let offset: number | undefined;

logger.info("Telegram polling started", {
  aiProvider: env.aiProvider,
  ownerConfigured: Boolean(env.telegramOwnerId),
  telegramOwnerId: env.telegramOwnerId,
  allowedTelegramUserIds: [...env.allowedTelegramUserIds],
  pollDeleteWebhook: env.telegramPollDeleteWebhook
});

await preparePollingMode();

while (true) {
  try {
    const updates = await getTelegramUpdates(offset);
    for (const update of updates) {
      await handleTelegramUpdate(update);
      offset = update.update_id + 1;
    }
  } catch (error) {
    logger.error("Polling error", error);
    await sleep(3000);
  }
}

async function preparePollingMode(): Promise<void> {
  try {
    const info = await getTelegramWebhookInfo();
    if (!info.url) return;

    if (env.telegramPollDeleteWebhook) {
      await deleteTelegramWebhook(false);
      logger.warn("Deleted Telegram webhook before polling", {
        previousUrl: info.url,
        pendingUpdateCount: info.pending_update_count
      });
      return;
    }

    logger.warn("Telegram webhook is configured; polling may fail until webhook is removed", {
      url: info.url,
      pendingUpdateCount: info.pending_update_count,
      hint: "Set TELEGRAM_POLL_DELETE_WEBHOOK=true to let poll startup delete the webhook."
    });
  } catch (error) {
    logger.warn("Could not inspect Telegram webhook before polling", error);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
