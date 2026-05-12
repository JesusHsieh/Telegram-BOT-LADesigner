import { env } from "../utils/env.js";
import { getTrustedUserIds, listTrustedUserIds } from "./securityConfig.js";

export type AccessRole = "owner" | "trusted" | "blocked";

export type TelegramUserContext = {
  id?: number;
  username?: string;
  firstName?: string;
};

export function getAccessRole(user: TelegramUserContext): AccessRole {
  if (!user.id) return "blocked";
  if (env.telegramOwnerId && user.id === env.telegramOwnerId) return "owner";
  if (env.allowedTelegramUserIds.has(user.id)) return "trusted";
  if (getTrustedUserIds().has(user.id)) return "trusted";
  return "blocked";
}

export function getAccessRoleLabel(role: AccessRole): string {
  const labels: Record<AccessRole, string> = {
    owner: "系統擁有者 / 全授權",
    trusted: "一般授權使用者",
    blocked: "未授權"
  };
  return labels[role];
}

export function canUseBot(user: TelegramUserContext): boolean {
  return getAccessRole(user) !== "blocked";
}

export function isOwner(user: TelegramUserContext): boolean {
  return getAccessRole(user) === "owner";
}

export function getPolicySummary(user?: TelegramUserContext): string {
  const role = user ? getAccessRole(user) : "owner";
  const trustedFromEnv = [...env.allowedTelegramUserIds];
  const trustedFromTelegram = listTrustedUserIds();
  const trustedAll = [...new Set([...trustedFromEnv, ...trustedFromTelegram])].sort((a, b) => a - b);

  if (role !== "owner") {
    const usageLines =
      role === "trusted"
        ? ["- 可使用主要工作指令。", "- 不可使用 /auth 系統管理指令。"]
        : ["- 未授權使用者不可使用 Bot。", "- 不會進入 command parser，也不會觸發 AI API。"];
    return [
      "【權限設定】",
      "",
      `目前角色：${getAccessRoleLabel(role)}`,
      "",
      "權限判斷方式：",
      "- 使用 Telegram user id 進行授權檢查。",
      "- 不使用暱稱或 username 作為安全判斷依據。",
      "",
      "使用範圍：",
      ...usageLines
    ].join("\n");
  }

  return [
    "【權限設定】",
    "",
    `目前角色：${getAccessRoleLabel(role)}`,
    "",
    "權限判斷方式：",
    "- 使用 Telegram user id 進行授權檢查。",
    "- 不使用暱稱或 username 作為安全判斷依據。",
    "",
    "目前授權清單：",
    `- 系統擁有者 / 全授權：${env.telegramOwnerId ?? "未設定"}`,
    `- 一般授權使用者：${trustedAll.length > 0 ? trustedAll.join(", ") : "未設定"}`,
    "",
    "權限說明：",
    "- 系統擁有者可使用所有主要工作指令與系統管理指令。",
    "- 一般授權使用者可使用主要工作指令，但不可管理授權名單。",
    "- 未授權使用者不可使用 Bot，也不會觸發 AI API。",
    "",
    "系統管理指令：",
    "- /auth list：查看一般授權使用者。",
    "- /auth add [user_id]：新增一般授權使用者。",
    "- /auth remove [user_id]：移除一般授權使用者。"
  ].join("\n");
}
