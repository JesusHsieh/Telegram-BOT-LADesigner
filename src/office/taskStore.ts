import type { SearchResult, TaskRecord, UserTaskContext } from "./types.js";

const tasks = new Map<string, TaskRecord>();
const userContexts = new Map<number, UserTaskContext>();
const activeJobByUser = new Map<number, string>();
const searchResultsByJob = new Map<string, SearchResult[]>();

export function createJobId(prefix: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${prefix}_${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
}

export function saveTask(userId: number | undefined, task: TaskRecord): TaskRecord {
  tasks.set(task.job_id, task);
  if (userId) {
    const context = getUserContext(userId);
    if (task.command === "find") {
      context.last_search_id = task.job_id;
    } else if (task.command === "make") {
      context.last_output_id = task.job_id;
    } else {
      context.last_task_id = task.job_id;
    }

    if (task.status === "pending") {
      activeJobByUser.set(userId, task.job_id);
    } else {
      activeJobByUser.delete(userId);
    }
    userContexts.set(userId, context);
  }
  return task;
}

export function updateTask(jobId: string, patch: Partial<TaskRecord>): TaskRecord | undefined {
  const current = tasks.get(jobId);
  if (!current) return undefined;
  const next = { ...current, ...patch };
  tasks.set(jobId, next);
  if (next.user_id && activeJobByUser.get(next.user_id) === jobId && next.status !== "pending") {
    activeJobByUser.delete(next.user_id);
  }
  return next;
}

export function getTask(jobId: string): TaskRecord | undefined {
  return tasks.get(jobId);
}

export function getUserContext(userId: number | undefined): UserTaskContext {
  if (!userId) return {};
  const current = userContexts.get(userId) ?? {};
  userContexts.set(userId, current);
  return current;
}

export function updateUserContext(userId: number | undefined, patch: Partial<UserTaskContext>): UserTaskContext {
  if (!userId) return {};
  const next = { ...getUserContext(userId), ...patch };
  userContexts.set(userId, next);
  return next;
}

export function getLastTask(userId: number | undefined): TaskRecord | undefined {
  const jobId = getUserContext(userId).last_task_id;
  return jobId ? tasks.get(jobId) : undefined;
}

export function getLastSearchTask(userId: number | undefined): TaskRecord | undefined {
  const jobId = getUserContext(userId).last_search_id;
  return jobId ? tasks.get(jobId) : undefined;
}

export function getLastReadTask(userId: number | undefined): TaskRecord | undefined {
  const jobId = getUserContext(userId).last_read_id;
  return jobId ? tasks.get(jobId) : undefined;
}

export function setLastRead(userId: number | undefined, jobId: string): void {
  updateUserContext(userId, { last_read_id: jobId });
}

export function getActiveTask(userId: number | undefined): TaskRecord | undefined {
  if (!userId) return undefined;
  const jobId = activeJobByUser.get(userId);
  return jobId ? tasks.get(jobId) : undefined;
}

export function cancelActiveTask(userId: number | undefined): TaskRecord | undefined {
  const active = getActiveTask(userId);
  if (!active || !userId) return undefined;
  const cancelled = updateTask(active.job_id, { status: "cancelled" });
  activeJobByUser.delete(userId);
  return cancelled;
}

export function clearUserTaskState(userId: number | undefined): UserTaskContext {
  if (!userId) return {};
  activeJobByUser.delete(userId);
  const current = getUserContext(userId);
  const next: UserTaskContext = { current_project_id: current.current_project_id };
  userContexts.set(userId, next);
  return next;
}

export function saveSearchResults(jobId: string, results: SearchResult[]): void {
  searchResultsByJob.set(jobId, results);
}

export function getSearchResults(jobId: string | undefined): SearchResult[] {
  if (!jobId) return [];
  return searchResultsByJob.get(jobId) ?? [];
}

export function resolveDefaultReadTask(userId: number | undefined): TaskRecord | undefined {
  return getLastSearchTask(userId) ?? getLastTask(userId);
}

export function resolveDefaultMakeSummaryTask(userId: number | undefined): TaskRecord | undefined {
  return getLastReadTask(userId) ?? getLastTask(userId);
}

export function resolveDefaultMakeReportTask(userId: number | undefined): TaskRecord | undefined {
  return getLastTask(userId);
}
