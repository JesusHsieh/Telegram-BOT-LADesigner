import OpenAI from "openai";
import { env } from "../utils/env.js";
import { getMockLandscapeReply } from "./mockReplies.js";
import { getSystemPrompt, getTaskPrompt } from "./prompts.js";
import type { LandscapeIntent } from "./intentRouter.js";
import { findMaterials } from "../services/materialService.js";
import { findPlants } from "../services/plantService.js";
import { findWorkItems } from "../services/costService.js";

export async function generateLandscapeReply(input: {
  intent: LandscapeIntent;
  userInput: string;
}): Promise<string> {
  const context = buildDataContext(input.intent, input.userInput);

  if (env.aiProvider === "mock") {
    return getMockLandscapeReply({
      intent: input.intent,
      userInput: input.userInput,
      dataContext: context
    });
  }

  const client = new OpenAI({ apiKey: env.openaiApiKey });
  const response = await client.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.4,
    messages: [
      { role: "system", content: getSystemPrompt() },
      { role: "user", content: getTaskPrompt(input.intent, input.userInput, context) }
    ]
  });

  return response.choices[0]?.message?.content?.trim() ?? "目前無法產生回覆，請稍後再試。";
}

function buildDataContext(intent: LandscapeIntent, userInput: string): string {
  if (intent === "plant") {
    return JSON.stringify(findPlants(userInput), null, 2);
  }
  if (intent === "material") {
    return JSON.stringify(findMaterials(userInput), null, 2);
  }
  if (intent === "cost") {
    return JSON.stringify(findWorkItems(userInput), null, 2);
  }
  return "v0.1 mock/openai 共用流程；非資料型任務請依使用者條件輸出初步建議。";
}
