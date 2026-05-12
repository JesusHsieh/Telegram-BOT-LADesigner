import { getAccessRole, type TelegramUserContext } from "../security/accessControl.js";
import { buildMockTaskData } from "../office/mockData.js";
import type { DataSource, ProjectContext, SearchResult, TaskRecord, TaskType } from "../office/types.js";
import { buildExecutorDataSources, runMockExecutors } from "../office/executorRouter.js";
import { audit } from "./auditTool.js";
import { draftTaskSummary } from "./aiDraftTool.js";
import { generateDocument } from "./documentTool.js";
import { getCurrentProject, setCurrentProject } from "./projectTool.js";
import { searchData } from "./searchTool.js";
import {
  cancelActiveTask,
  clearUserTaskState,
  createJobId,
  getLastSearchTask,
  getSearchResults,
  getTask,
  getUserContext,
  resolveDefaultMakeReportTask,
  resolveDefaultMakeSummaryTask,
  resolveDefaultReadTask,
  saveSearchResults,
  saveTask,
  setLastRead,
  updateTask,
  updateUserContext
} from "./taskMemoryTool.js";

export const tools = {
  project: {
    getCurrent: getCurrentProject,
    setCurrent: setCurrentProject,
    getUserContext
  },
  task: {
    get: getTask,
    getUserContext,
    getLastSearchTask,
    getSearchResults,
    resolveDefaultReadTask,
    resolveDefaultMakeSummaryTask,
    resolveDefaultMakeReportTask,
    setLastRead,
    cancelActiveTask,
    clearUserTaskState
  },
  document: {
    generate: generateDocument
  },
  audit: {
    log: audit
  },
  async createDoTask(user: TelegramUserContext, taskType: TaskType, rawInput: string): Promise<TaskRecord> {
    const project = getCurrentProject(user);
    const baseTaskData = buildMockTaskData({ taskType, rawInput, project });
    const executorResults = await runMockExecutors({ taskType, rawInput, project });
    const taskData = {
      ...(typeof baseTaskData === "object" && baseTaskData ? baseTaskData : { base: baseTaskData }),
      executor_policy: {
        mode: "mock",
        results: executorResults
      }
    };
    const jobId = createJobId(taskType);
    const task = saveTask(user.id, {
      job_id: jobId,
      command: "do",
      task_type: taskType,
      raw_input: rawInput,
      user_id: user.id,
      username: user.username,
      role: getAccessRole(user),
      project_id: project?.project_id,
      data_mode: "mock",
      created_at: new Date().toISOString(),
      status: "pending",
      task_data: taskData,
      ai_summary: "",
      report_generated: false,
      data_sources: [...buildDataSources(project, "mock_data"), ...buildExecutorDataSources(executorResults)]
    });
    audit("task.created", { job_id: jobId, task_type: taskType, user_id: user.id, project_id: project?.project_id });
    const aiSummary = await draftTaskSummary({ taskType, rawInput, taskData, project });
    const done = updateTask(task.job_id, { status: "done", ai_summary: aiSummary }) ?? task;
    audit("task.completed", { job_id: jobId, task_type: taskType, user_id: user.id });
    return done;
  },
  createSearchTask(user: TelegramUserContext, query: string): { task: TaskRecord; results: SearchResult[] } {
    const project = getCurrentProject(user);
    const results = searchData(query, project);
    const jobId = createJobId("search");
    const task = saveTask(user.id, {
      job_id: jobId,
      command: "find",
      task_type: "search",
      raw_input: query,
      user_id: user.id,
      username: user.username,
      role: getAccessRole(user),
      project_id: project?.project_id,
      data_mode: "mock",
      created_at: new Date().toISOString(),
      status: "done",
      task_data: { notice: "目前為測試資料 / Mock Data", results, project_context: project },
      ai_summary: formatSearchResultsForSummary(results),
      report_generated: false,
      data_sources: buildDataSources(project, "mock_search")
    });
    saveSearchResults(jobId, results);
    audit("search.completed", { job_id: jobId, query, result_count: results.length, user_id: user.id });
    return { task, results };
  },
  markReportGenerated(task: TaskRecord): TaskRecord {
    const updated = updateTask(task.job_id, { report_generated: true, status: "report_generated" }) ?? task;
    updateUserContext(task.user_id, { last_output_id: updated.job_id });
    audit("document.generated", { job_id: task.job_id, user_id: task.user_id });
    return updated;
  }
};

function buildDataSources(project: ProjectContext | undefined, type: DataSource["type"]): DataSource[] {
  const sources: DataSource[] = [{ id: type, label: "Mock Data", type }];
  if (project) sources.unshift({ id: project.project_id, label: project.name, type: "mock_project" });
  return sources;
}

function formatSearchResultsForSummary(results: SearchResult[]): string {
  if (results.length === 0) return "目前找不到符合資料。";
  return results
    .map((item, index) => `[${index + 1}] ${item.title}\n類型：${item.type}\n來源：${item.source}\n摘要：${item.summary}`)
    .join("\n\n");
}
