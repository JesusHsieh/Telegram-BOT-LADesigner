import OpenAI from "openai";
import { env } from "../utils/env.js";
import { basePrompt, getOutputFormat, getTaskPrompt } from "./prompts.js";
import type { ProjectContext, SearchResult, TaskRecord, TaskType } from "./types.js";

export async function generateTaskSummary(input: {
  taskType: TaskType;
  rawInput: string;
  taskData: unknown;
  project?: ProjectContext;
}): Promise<string> {
  if (env.aiProvider === "mock") {
    return buildMockSummary(input.taskType, input.rawInput, input.project);
  }

  const client = new OpenAI({ apiKey: env.openaiApiKey });
  const response = await client.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.3,
    messages: [
      { role: "system", content: basePrompt },
      {
        role: "user",
        content: [getTaskPrompt(input.taskType), "", "taskData:", JSON.stringify(input.taskData, null, 2), "", getOutputFormat("summary")].join("\n")
      }
    ]
  });

  return response.choices[0]?.message?.content?.trim() ?? "目前無法產生任務摘要。";
}

export function generateMarkdownReport(task: TaskRecord, kind: "summary" | "report"): string {
  if (kind === "summary") {
    return [
      "# 任務摘要",
      "",
      "⚠️ 目前為測試資料 / Mock Data",
      "",
      `- job_id：${task.job_id}`,
      `- task_type：${task.task_type}`,
      `- status：${task.status}`,
      task.project_id ? `- project_id：${task.project_id}` : undefined,
      "",
      "## 摘要",
      "",
      task.ai_summary || "目前沒有摘要。"
    ]
      .filter((line): line is string => line !== undefined)
      .join("\n");
  }

  const projectContext = extractProjectContext(task.task_data);
  const sources = task.data_sources.map((source) => `- ${source.label}：${source.type} / ${source.id}`).join("\n") || "- 未提供";

  return [
    "# 任務報告",
    "",
    "⚠️ 目前為測試資料 / Mock Data",
    "",
    "## 1. 報告標題",
    "",
    `${task.task_type} 任務報告 - ${task.job_id}`,
    "",
    "## 2. 任務摘要",
    "",
    task.ai_summary || "目前沒有摘要。",
    "",
    "## 3. 任務背景",
    "",
    `- 原始輸入：${task.raw_input || "未提供"}`,
    `- 建立時間：${task.created_at}`,
    `- 狀態：${task.status}`,
    "",
    "## 4. 專案上下文",
    "",
    projectContext,
    "",
    "## 5. 資料來源",
    "",
    sources,
    "",
    "## 6. 關鍵結果",
    "",
    summarizeTaskData(task.task_data),
    "",
    "## 7. 風險與不確定事項",
    "",
    "- 目前尚未讀取真實 NAS、政府 API 或正式圖說。",
    "- 涉及基地、法規、報價、契約、施工與安全事項，皆需專業人員複核。",
    "",
    "## 8. AI 綜合判讀",
    "",
    task.ai_summary || "目前沒有 AI 綜合判讀。",
    "",
    "## 9. 建議下一步",
    "",
    "- 補齊正式資料來源。",
    "- 由負責人確認任務結果是否可進入下一階段。",
    "- 需要時再用 /do 或 /find 追加任務。",
    "",
    "## 10. 需人工複核事項",
    "",
    "- 現地條件、正式圖說、最新法規、材料規格、廠商報價與業主需求。",
    "",
    "## 11. 免責聲明",
    "",
    "本報告為 AI 輔助整理內容，僅供內部初步參考，不得作為正式報價、合約依據、法規最終判斷、施工圖正式文件或公共工程審查文件。"
  ].join("\n");
}

function buildMockSummary(taskType: TaskType, rawInput: string, project?: ProjectContext): string {
  return [
    "📌 任務類型",
    `${taskType}`,
    "",
    "📁 目前專案",
    project ? `${project.name}（${project.project_id}）` : "未設定",
    "",
    "🔍 資料來源",
    "目前為測試資料 / Mock Data；尚未讀取真實 NAS、政府 API 或正式專案資料夾。",
    "",
    "📄 關鍵結果",
    ...getMockResultLines(taskType, rawInput),
    "",
    "⚠️ 風險 / 不確定事項",
    "- 這是 mock 模式，不能作為正式結論。",
    "- 涉及基地、法規、成本、契約或工程責任時，需由專業人員確認。",
    "",
    "✅ 建議下一步",
    "- 可用 /read last 查看任務紀錄。",
    "- 可用 /make report 產生 Markdown 報告。",
    "- 若要更精準，請補充基地、圖說、材料、面積或專案條件。"
  ].join("\n");
}

function getMockResultLines(taskType: TaskType, rawInput: string): string[] {
  const byTask: Record<TaskType, string[]> = {
    land: [
      `- 已建立基地檢核任務：${rawInput}`,
      "- 後續正式版應串接地籍、都市計畫、周邊環境、災害潛勢與基地限制資料。"
    ],
    site: ["- 已建立現場 / 基地條件分析任務。", "- 建議檢核日照、風、排水、覆土、動線、視線與維護動線。"],
    plant: ["- 已建立植栽建議任務。", "- 植栽建議需依地點、日照、風、排水、覆土深度與維護條件人工確認。"],
    cost: ["- 已建立工項拆解任務。", "- 僅拆 WBS、數量欄位與漏項風險，不提供正式單價或總價。"],
    rfi: ["- 已建立 RFI 草稿任務。", "- 草稿應包含問題位置、現況、圖說要求、可能影響與希望回覆事項。"],
    brief: ["- 已建立簡報文字任務。", "- 可整理成主標、副標、業主版說明、空間策略、植栽與材料方向。"],
    review: ["- 已建立資料審閱任務。", "- 建議整理疑義、衝突、缺漏、需補充資料與責任單位。"],
    check: ["- 已建立專業檢核任務。", "- 可產生 checklist，包含檢核項目、標準、缺漏資料與建議下一步。"]
  };
  return byTask[taskType];
}

function extractProjectContext(taskData: unknown): string {
  const data = taskData as { project_context?: ProjectContext };
  if (!data?.project_context) return "未設定。";
  const project = data.project_context;
  return [
    `- 專案名稱：${project.name}`,
    `- 專案類型：${project.project_type}`,
    `- 基地位置：${project.location}`,
    `- 專案階段：${project.stage}`,
    `- 預算等級：${project.budget_level}`,
    `- 業主偏好：${project.client_preferences.join("、")}`,
    `- 設計風格：${project.design_style.join("、")}`,
    `- 已知限制：${project.known_constraints.join("、")}`
  ].join("\n");
}

function summarizeTaskData(taskData: unknown): string {
  const data = taskData as { matched_items?: SearchResult[] };
  const items = data?.matched_items ?? [];
  if (items.length === 0) return "- 未命中 mock data。";
  return items.map((item, index) => `${index + 1}. ${item.title}：${item.summary}`).join("\n");
}
