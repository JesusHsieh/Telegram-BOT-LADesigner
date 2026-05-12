import "dotenv/config";
import { getTelegramUpdates, handleTelegramUpdate } from "../telegram/bot.js";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";

let offset: number | undefined;

logger.info("Telegram polling started", {
  aiProvider: env.aiProvider,
  ownerConfigured: Boolean(env.telegramOwnerId),
  telegramOwnerId: env.telegramOwnerId,
  allowedTelegramUserIds: [...env.allowedTelegramUserIds]
});

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
