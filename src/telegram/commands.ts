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
  const greetingName = user.firstName ?? user.username ?? "你好";

  return [
    `${greetingName}，歡迎來到 LA Design Assistant。`,
    "",
    "我是你的景觀設計工作助理，會先幫你把需求整理成可以執行的任務，再依照任務方向接到目前的 mock n8n / mock NAS bridge。未來接上公司資料後，我會協助把 Telegram 變成進入內部設計流程的入口。",
    "",
    "你可以把我當成：",
    "- 專案前期資料整理員",
    "- 景觀設計任務分流器",
    "- 植栽、成本、RFI、簡報與檢核草稿助手",
    "- 未來串接 n8n / NAS / 內部工具的安全入口",
    "",
    "我目前能先協助你：設定工作專案、建立任務、整理 mock 資料、產生摘要與 Markdown 報告。",
    "",
    "你的狀態：",
    `- 你的 Telegram user id：${user.id ?? "無法取得"}`,
    `- 你的角色：${getAccessRoleLabel(role)}`,
    `- 使用權限：${isAllowed ? "已授權" : "尚未授權"}`,
    "",
    isAllowed
      ? "我們可以開始了。建議先設定一個工作專案，之後我才知道所有任務要放在哪個上下文裡。"
      : "你目前還沒有使用權限。請把上方 Telegram user id 傳給系統擁有者，請對方用 /auth add [user_id] 幫你加入授權。",
    "",
    "你可以先試：",
    "/help",
    "/whoami",
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
