import type { ProjectContext, SearchResult, TaskRecord, TaskType } from "../office/types.js";
import type { TelegramUserContext } from "../security/accessControl.js";

export type ToolResult<T> = {
  data: T;
  source: string;
  mode: "mock" | "memory";
};

export type CreateTaskInput = {
  user: TelegramUserContext;
  taskType: TaskType;
  rawInput: string;
  project?: ProjectContext;
};

export type SearchInput = {
  query: string;
  project?: ProjectContext;
};

export type ReportInput = {
  task: TaskRecord;
  outputType: "summary" | "report";
};

export type SearchOutput = {
  jobId: string;
  results: SearchResult[];
  task: TaskRecord;
};
