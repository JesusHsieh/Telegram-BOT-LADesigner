import {
  getAccessRole,
  getAccessRoleLabel,
  getPolicySummary,
  isOwner,
  type TelegramUserContext
} from "../security/accessControl.js";
import { addTrustedUserId, listTrustedUserIds, removeTrustedUserId } from "../security/securityConfig.js";
import { handleOfficeCommand } from "../office/taskRouter.js";

export async function handleCommand(input: string, user: TelegramUserContext): Promise<string> {
  const rawCommand = readRawCommand(input);

  if (rawCommand === "whoami") {
    return formatWhoAmI(user);
  }

  if (rawCommand === "policy") {
    return getPolicySummary(user);
  }

  if (rawCommand === "auth") {
    return handleAuthCommand(removeCommand(input), user);
  }

  return handleOfficeCommand(input, user);
}

function formatWhoAmI(user: TelegramUserContext): string {
  const role = getAccessRole(user);
  return [
    "【我的身份】",
    "",
    `Telegram user id：${user.id ?? "未提供"}`,
    `username：${user.username ? `@${user.username}` : "未提供"}`,
    `first name：${user.firstName ?? "未提供"}`,
    `目前角色：${getAccessRoleLabel(role)}`,
    "",
    "說明：",
    "- 系統以 Telegram user id 判斷授權。",
    "- username 或暱稱只作為顯示資訊，不作為權限依據。"
  ].join("\n");
}

function handleAuthCommand(content: string, user: TelegramUserContext): string {
  if (!isOwner(user)) {
    return "你沒有權限使用 /auth 系統管理指令。";
  }

  const [action, rawUserId] = content.trim().split(/\s+/);
  const userId = Number(rawUserId);

  if (!action || action === "list") {
    return formatAuthList();
  }

  if (!Number.isInteger(userId) || userId <= 0) {
    return [
      "【授權管理】",
      "",
      "格式不正確。",
      "",
      "可用指令：",
      "/auth list",
      "/auth add 123456789",
      "/auth remove 123456789"
    ].join("\n");
  }

  if (action === "add") {
    addTrustedUserId(userId);
    return ["【授權管理】", "", `已新增一般授權使用者：${userId}`, "", formatAuthList()].join("\n");
  }

  if (action === "remove") {
    removeTrustedUserId(userId);
    return ["【授權管理】", "", `已移除一般授權使用者：${userId}`, "", formatAuthList()].join("\n");
  }

  return [
    "【授權管理】",
    "",
    "未知的 /auth 子指令。",
    "",
    "可用指令：",
    "/auth list",
    "/auth add 123456789",
    "/auth remove 123456789"
  ].join("\n");
}

function formatAuthList(): string {
  const trusted = listTrustedUserIds();
  return [
    "【授權使用者清單】",
    "",
    `一般授權使用者：${trusted.length > 0 ? trusted.join(", ") : "未設定"}`,
    "",
    "系統擁有者由 TELEGRAM_OWNER_ID 設定，建議只用 Telegram 指令管理一般授權使用者。"
  ].join("\n");
}

function readRawCommand(input: string): string | undefined {
  const match = input.trim().match(/^\/([a-zA-Z_]+)(?:@\w+)?(?:\s|$)/);
  return match?.[1]?.toLowerCase();
}

function removeCommand(input: string): string {
  return input.trim().replace(/^\/[a-zA-Z_]+(?:@\w+)?\s*/, "");
}
