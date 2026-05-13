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

  if (rawCommand === "start") {
    return formatStartMessage(user);
  }

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

export function formatStartMessage(user: TelegramUserContext): string {
  const role = getAccessRole(user);
  const isAllowed = role !== "blocked";

  return [
    "歡迎使用 LA Design Assistant。",
    "",
    "這是一個景觀設計 Telegram AI 助理，目前定位為公司內部橋接型 bot。",
    "",
    "我可以協助：",
    "- 設定目前工作專案",
    "- 整理基地、現場、植栽、成本、RFI、簡報、審查與檢核任務",
    "- 依 Task Router 判斷任務方向",
    "- 以 mock n8n / mock NAS bridge 驗證未來工作流",
    "- 產生任務摘要與 Markdown 報告",
    "",
    "目前狀態：",
    `- 你的 Telegram user id：${user.id ?? "無法取得"}`,
    `- 你的角色：${getAccessRoleLabel(role)}`,
    `- 使用權限：${isAllowed ? "已授權" : "尚未授權"}`,
    "",
    isAllowed
      ? "開始方式：先使用 /project set [project_id] 設定專案，再使用 /do、/find、/read、/make 等任務指令。"
      : "請把上方 Telegram user id 提供給系統擁有者，請對方用 /auth add [user_id] 加入授權。",
    "",
    "常用指令：",
    "/help",
    "/whoami",
    "/policy",
    "/project set nangang_airport",
    "/do brief 簡報需求",
    "/make report"
  ].join("\n");
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
