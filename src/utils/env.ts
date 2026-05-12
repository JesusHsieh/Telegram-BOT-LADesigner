function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const aiProvider = process.env.AI_PROVIDER ?? "openai";

if (!["mock", "openai"].includes(aiProvider)) {
  throw new Error("AI_PROVIDER must be either 'mock' or 'openai'");
}

export const env = {
  telegramBotToken: required("TELEGRAM_BOT_TOKEN"),
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
  telegramOwnerId: parseOptionalUserId(process.env.TELEGRAM_OWNER_ID),
  allowedTelegramUserIds: parseAllowedUserIds(process.env.ALLOWED_TELEGRAM_USER_IDS),
  aiProvider: aiProvider as "mock" | "openai",
  openaiApiKey: aiProvider === "openai" ? required("OPENAI_API_KEY") : process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  port: Number(process.env.PORT ?? 3000)
};

function parseOptionalUserId(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const id = Number(value.trim());
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

function parseAllowedUserIds(value: string | undefined): Set<number> {
  const ids = new Set<number>();
  if (!value) return ids;

  for (const part of value.split(",")) {
    const id = Number(part.trim());
    if (Number.isInteger(id) && id > 0) {
      ids.add(id);
    }
  }

  return ids;
}
