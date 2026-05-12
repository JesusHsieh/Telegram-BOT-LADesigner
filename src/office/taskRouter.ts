import { parseOfficeCommand, taskTypes } from "./commandParser.js";
import type { ParsedCommand, ProjectContext, SearchResult, TaskRecord, TaskType } from "./types.js";
import type { TelegramUserContext } from "../security/accessControl.js";
import { tools } from "../tools/toolOrchestrator.js";

export async function handleOfficeCommand(input: string, user: TelegramUserContext): Promise<string> {
  const parsed = parseOfficeCommand(input);

  if (requiresProject(parsed.command) && !tools.project.getCurrent(user)) {
    return formatProjectRequired();
  }

  switch (parsed.command) {
    case "help":
      return formatOfficeHelpOrdered();
    case "project":
      return handleProject(parsed, user);
    case "list":
      return handleList(parsed);
    case "find":
      return handleFind(parsed, user);
    case "read":
      return handleRead(parsed, user);
    case "do":
      return handleDo(parsed, user);
    case "make":
      return handleMake(parsed, user);
    case "status":
      return handleStatus(user);
    case "cancel":
      return handleCancel(user);
    case "revise":
    case "expand":
    case "workflow":
    case "save":
      return "此功能已規劃，尚未開放。";
    case "unknown":
      return handleNaturalLanguage(parsed.rawInput);
    default:
      return "";
  }
}

function requiresProject(command: ParsedCommand["command"]): boolean {
  return ["find", "read", "do", "make", "status"].includes(command);
}

function formatProjectRequired(): string {
  return [
    "請先設定專案。",
    "",
    "目前還沒有 current project，因此不能進入任務、搜尋、讀取或輸出流程。",
    "",
    "請先使用：",
    "/project set [project_id]",
    "",
    "可用範例：",
    "/project set nangang_airport",
    "",
    "設定後再使用 /do、/find、/read、/make 或 /status。"
  ].join("\n");
}

function handleProject(parsed: ParsedCommand, user: TelegramUserContext): string {
  if (parsed.subcommand === "set") {
    const projectId = parsed.rawInput || parsed.args.slice(1).join(" ");
    const project = tools.project.setCurrent(user, projectId);
    if (!project) return `找不到 mock project：${projectId || "未提供"}`;
    return [
      "【專案切換完成】",
      "",
      `project_id：${project.project_id}`,
      `專案名稱：${project.name}`,
      "",
      "已載入的專案背景資料摘要：",
      project.background_summary,
      "",
      "可接續指令：",
      "/project info",
      "/find 關鍵字",
      "/do land 基地或地號檢核內容",
      "/do plant 植栽條件或需求"
    ].join("\n");
  }

  if (parsed.subcommand === "info") {
    const project = tools.project.getCurrent(user);
    if (!project) return "目前尚未設定專案，可使用 /project set [project_id] 設定。";
    return formatProjectInfo(project, user);
  }

  return ["【project 指令】", "", "/project set [project_id]", "/project info"].join("\n");
}

function handleList(parsed: ParsedCommand): string {
  const target = parsed.subcommand as TaskType | "do" | undefined;
  if (!target || target === "do") {
    return ["【可用 /do task_type】", "", ...taskTypes.map((type) => `- ${type}`)].join("\n");
  }

  const fields = taskInputFields[target as TaskType];
  if (!fields) return ["【可用 /do task_type】", "", ...taskTypes.map((type) => `- ${type}`)].join("\n");
  return [`【${target} 建議輸入條件】`, "", ...fields.map((field) => `- ${field}`)].join("\n");
}

function handleFind(parsed: ParsedCommand, user: TelegramUserContext): string {
  const query = parsed.rawInput.trim();
  if (!query) return ["【搜尋資料】", "", "請輸入搜尋關鍵字。", "格式：/find 關鍵字"].join("\n");

  const project = tools.project.getCurrent(user);
  const { task, results } = tools.createSearchTask(user, query);

  const base = [
    "【搜尋結果】",
    "",
    "目前為測試資料 / Mock Data",
    "",
    `job_id：${task.job_id}`,
    `搜尋關鍵字：${query}`,
    project ? `目前專案：${project.name}` : "目前專案：未設定",
    "搜尋來源：mock data",
    ""
  ];

  if (results.length === 0) {
    return [...base, "目前找不到符合資料。", "", "建議下一步：", "/find 其他關鍵字", "/status"].join("\n");
  }

  return [...base, formatSearchResults(results), "", "建議下一步：", "/read last", "/read 1", "/make summary", "/status"].join("\n");
}

function handleRead(parsed: ParsedCommand, user: TelegramUserContext): string {
  const target = parsed.rawInput.trim();
  const lastSearch = tools.task.getLastSearchTask(user.id);

  if (/^\d+$/.test(target)) {
    const index = Number(target) - 1;
    const result = tools.task.getSearchResults(lastSearch?.job_id)[index];
    if (!result || !lastSearch) return "找不到上一筆搜尋結果的指定編號。";
    tools.task.setLastRead(user.id, lastSearch.job_id);
    return formatSearchResultRead(lastSearch, result, index + 1);
  }

  const task = target === "last" || !target ? tools.task.resolveDefaultReadTask(user.id) : tools.task.get(target);
  if (!task) return "找不到可讀取的任務紀錄。";
  tools.task.setLastRead(user.id, task.job_id);
  return formatTaskDetail(task);
}

async function handleDo(parsed: ParsedCommand, user: TelegramUserContext): Promise<string> {
  if (!parsed.taskType) {
    return ["【do 指令】", "", "/do [task_type] [content]", "", `可用 task_type：${taskTypes.join(", ")}`].join("\n");
  }

  const validation = validateTaskInput(parsed.taskType, parsed.rawInput, user.id);
  if (!validation.ok) return formatMissingInput(parsed.taskType, validation.missing);

  const task = await tools.createDoTask(user, parsed.taskType, parsed.rawInput);
  return formatTaskResult(task);
}

function handleMake(parsed: ParsedCommand, user: TelegramUserContext): string {
  if (!parsed.outputType) {
    return ["【make 指令】", "", "/make summary", "/make report", "/make report [job_id]"].join("\n");
  }

  const target = parsed.rawInput.trim();
  const task = target
    ? tools.task.get(target)
    : parsed.outputType === "report"
      ? tools.task.resolveDefaultMakeReportTask(user.id)
      : tools.task.resolveDefaultMakeSummaryTask(user.id);
  if (!task) return "找不到可輸出的任務。";

  const updated = parsed.outputType === "report" ? tools.markReportGenerated(task) : task;
  return tools.document.generate(updated, parsed.outputType);
}

function handleStatus(user: TelegramUserContext): string {
  const taskId = tools.task.getUserContext(user.id).last_task_id;
  const task = taskId ? tools.task.get(taskId) : undefined;
  if (!task) return "目前沒有上一筆任務狀態。";
  return [
    "【任務狀態】",
    "",
    `job_id：${task.job_id}`,
    `task_type：${task.task_type}`,
    `status：${task.status}`,
    `project_id：${task.project_id ?? "未設定"}`,
    `data_mode：${task.data_mode}`,
    `report_generated：${task.report_generated ? "是" : "否"}`
  ].join("\n");
}

function handleCancel(user: TelegramUserContext): string {
  const cancelled = tools.task.cancelActiveTask(user.id);
  if (cancelled) return ["【任務已取消】", "", `已取消 pending 任務：${cancelled.job_id}`].join("\n");
  tools.task.clearUserTaskState(user.id);
  return "目前沒有 pending 任務，已清除上一筆快捷狀態；目前專案設定仍保留。";
}

function handleNaturalLanguage(input: string): string {
  const text = input.trim();
  if (!text) return ["【任務提示】", "", "請輸入 /help 查看可用指令。"].join("\n");

  if (["hi", "hello", "hey", "你好", "嗨"].includes(text.toLowerCase())) {
    return [
      "【LA Design Assistant】",
      "",
      "我可以協助你交辦資料搜尋、基地檢核、植栽建議、工項拆解、RFI 草稿與簡報文字。",
      "正式執行任務請使用指令，例如 /do、/find、/project。"
    ].join("\n");
  }

  const suggestion = suggestTask(text);
  if (!suggestion) {
    return [
      "【任務提示】",
      "",
      "我已收到你的訊息，但目前無法判斷要執行哪一類任務。",
      "為了避免誤動作，正式任務請使用明確指令。",
      "",
      "可用 /help 查看指令，或用 /list 查看任務類型。"
    ].join("\n");
  }

  return [
    "【任務提示】",
    "",
    `我判斷這可能是：${suggestion.label}`,
    "",
    "正式執行請改用：",
    suggestion.command
  ].join("\n");
}

const taskInputFields: Record<TaskType, string[]> = {
  land: ["地址", "地號", "GPS", "基地描述"],
  site: ["基地條件描述", "日照", "風", "排水", "覆土", "動線", "視線"],
  plant: ["地點 / 城市", "空間類型", "日照條件", "風大或一般環境", "維護程度", "風格偏好"],
  cost: ["面積", "工程範圍", "材料規格", "空間類型", "預算等級"],
  rfi: ["問題位置", "現況描述", "圖說要求", "可能影響", "希望對方回覆事項"],
  brief: ["設計概念", "空間主題", "使用族群", "希望語氣", "簡報用途"],
  review: ["要審閱的內容", "檔案名稱", "資料描述", "審查重點"],
  check: ["檢核對象", "檢核階段", "檢核範圍", "責任單位"]
};

function validateTaskInput(taskType: TaskType, rawInput: string, userId: number | undefined): { ok: boolean; missing: string[] } {
  const text = rawInput.trim();
  const hasProject = Boolean(tools.project.getCurrent({ id: userId }));
  const hasLastTask = Boolean(tools.task.getUserContext(userId).last_task_id);

  if (taskType === "site" && (text || hasProject || hasLastTask)) return { ok: true, missing: [] };

  if (taskType === "plant") {
    const count = [
      /台北|台中|台南|高雄|新北|桃園|城市|地點|屋頂|中庭|陽台|基地/.test(text),
      /屋頂|花園|中庭|庭院|入口|公共空間|空間/.test(text),
      /全日照|半日照|半陰|耐陰|日照/.test(text),
      /風大|強風|低維護|中維護|高維護|維護/.test(text),
      /自然|飯店感|現代|熱帶|風格/.test(text)
    ].filter(Boolean).length;
    return count >= 2 ? { ok: true, missing: [] } : { ok: false, missing: taskInputFields.plant };
  }

  const rules: Record<TaskType, RegExp> = {
    land: /地址|地號|gps|基地|段|小段|描述/i,
    site: /.+/,
    cost: /面積|平方|m2|工程|工項|中庭|屋頂|預算|鋪面|植栽/,
    rfi: /.+/,
    brief: /.+/,
    review: /.+/,
    check: /.+/,
    plant: /.+/
  };

  return rules[taskType].test(text) ? { ok: true, missing: [] } : { ok: false, missing: taskInputFields[taskType] };
}

function formatMissingInput(taskType: TaskType, missing: string[]): string {
  return [
    "【資料不足】",
    "",
    `task_type：${taskType}`,
    "",
    "建議補充以下任一或多項資料：",
    ...missing.map((item) => `- ${item}`),
    "",
    "範例格式：",
    `/do ${taskType} ${missing.slice(0, 3).join("、")} ...`,
    "",
    `可用 /list ${taskType} 查看建議輸入條件。`
  ].join("\n");
}

function formatProjectInfo(project: ProjectContext, user: TelegramUserContext): string {
  const context = tools.task.getUserContext(user.id);
  const recent = [context.last_task_id, context.last_search_id].filter(Boolean).join(", ") || "未提供";
  return [
    "【專案上下文】",
    "",
    `current_project_id：${project.project_id}`,
    `專案名稱：${project.name}`,
    `專案類型：${project.project_type}`,
    `基地位置：${project.location}`,
    `專案階段：${project.stage}`,
    `預算等級：${project.budget_level}`,
    `業主偏好：${project.client_preferences.join("、")}`,
    `設計風格：${project.design_style.join("、")}`,
    `已知限制：${project.known_constraints.join("、")}`,
    `最近相關任務：${recent}`,
    `資料來源：${project.source}`
  ].join("\n");
}

function formatTaskResult(task: TaskRecord): string {
  return [
    "【任務完成】",
    "",
    "目前為測試資料 / Mock Data",
    "",
    `job_id：${task.job_id}`,
    `task_type：${task.task_type}`,
    `project_id：${task.project_id ?? "未設定"}`,
    `status：${task.status}`,
    "",
    task.ai_summary,
    "",
    "可接續指令：",
    "/read last",
    "/make report",
    "/status"
  ].join("\n");
}

function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) return "目前找不到符合資料。";
  return results.map((item, index) => `[${index + 1}] ${item.title}\n類型：${item.type}\n來源：${item.source}\n摘要：${item.summary}`).join("\n\n");
}

function formatTaskDetail(task: TaskRecord): string {
  return [
    "【任務紀錄】",
    "",
    "目前為測試資料 / Mock Data",
    "",
    `job_id：${task.job_id}`,
    `任務類型：${task.task_type}`,
    `原始輸入：${task.raw_input || "未提供"}`,
    `狀態：${task.status}`,
    "",
    "任務摘要：",
    task.ai_summary || "尚未產生摘要。",
    "",
    "可接續指令：",
    "/make summary",
    "/make report",
    "/status"
  ].join("\n");
}

function formatSearchResultRead(task: TaskRecord, result: SearchResult, index: number): string {
  return [
    "【搜尋結果讀取】",
    "",
    "目前為測試資料 / Mock Data",
    "",
    `result index：[${index}]`,
    `job_id：${task.job_id}`,
    `任務類型：${result.type}`,
    `原始輸入：${task.raw_input || "未提供"}`,
    `狀態：${task.status}`,
    "",
    "資料摘要：",
    result.summary,
    "",
    "可接續指令：",
    "/make summary",
    "/make report",
    "/status"
  ].join("\n");
}

function suggestTask(text: string): { label: string; command: string } | undefined {
  const value = text.toLowerCase();
  if (["地號", "基地", "地址", "段", "小段"].some((key) => value.includes(key))) return { label: "基地 / 地號檢核", command: `/do land ${text}` };
  if (["植栽", "植物", "樹種", "灌木", "屋頂花園", "低維護"].some((key) => value.includes(key))) return { label: "植栽建議", command: `/do plant ${text}` };
  if (["工項", "工程", "成本", "預算", "報價"].some((key) => value.includes(key))) return { label: "工項拆解", command: `/do cost ${text}` };
  if (["rfi", "衝突", "圖說", "管線", "疑義"].some((key) => value.includes(key))) return { label: "RFI 草稿", command: `/do rfi ${text}` };
  if (["簡報", "說明", "文案", "業主", "概念"].some((key) => value.includes(key))) return { label: "簡報文字", command: `/do brief ${text}` };
  if (["找", "搜尋", "查", "資料", "檔案"].some((key) => value.includes(key))) return { label: "資料搜尋", command: `/find ${text}` };
  return undefined;
}

function formatOfficeHelpOrdered(): string {
  return [
    "【LA Design Assistant 使用說明】",
    "",
    "一、主要工作指令",
    "",
    "/project set [project_id]",
    "用途：設定目前工作專案。",
    "格式：/project set 專案代號或專案名稱",
    "",
    "/project info",
    "用途：查看目前專案上下文。",
    "",
    "/list [task_type]",
    "用途：查看支援的任務類型，或查詢指定任務建議輸入條件。",
    "格式：/list 或 /list plant",
    "",
    "/find [keywords]",
    "用途：搜尋資料。",
    "格式：/find 關鍵字",
    "",
    "/read last",
    "用途：讀取上一筆任務或搜尋結果。",
    "",
    "/read [job_id]",
    "用途：讀取指定任務紀錄。",
    "",
    "/do [task_type] [content]",
    "用途：交辦專業任務。",
    "格式：/do 任務類型 任務內容",
    "任務類型：land 基地檢核、site 現場條件、plant 植栽建議、cost 工項拆解、rfi RFI草稿、brief 簡報文字、review 資料審閱、check 專業檢核",
    "",
    "/make summary",
    "用途：針對上一筆任務產生 Markdown 摘要。",
    "",
    "/make report [job_id]",
    "用途：針對上一筆或指定任務產生 Markdown 報告。",
    "",
    "/status",
    "用途：顯示上一筆任務狀態。",
    "",
    "/cancel",
    "用途：取消 pending 任務；若無 pending，清除上一筆快捷狀態。",
    "",
    "/revise [job_id] [修改指令]",
    "用途：基於既有任務結果進行局部修改。尚未開放。",
    "",
    "/expand [job_id] [section]",
    "用途：針對既有任務特定段落擴寫。尚未開放。",
    "",
    "/workflow [template_name]",
    "用途：執行預設工作流。尚未開放。",
    "",
    "/save [keyword] [content/job_id]",
    "用途：儲存常用模組或任務結果。尚未開放。",
    "",
    "二、系統管理指令",
    "",
    "/whoami",
    "用途：查看自己的 Telegram user id 與目前角色。",
    "",
    "/policy",
    "用途：查看目前權限設定。",
    "",
    "/auth list",
    "用途：查看一般授權使用者。僅系統擁有者可用。",
    "",
    "/auth add [user_id]",
    "用途：新增一般授權使用者。僅系統擁有者可用。",
    "格式：/auth add Telegram user id",
    "",
    "/auth remove [user_id]",
    "用途：移除一般授權使用者。僅系統擁有者可用。",
    "格式：/auth remove Telegram user id"
  ].join("\n");
}
