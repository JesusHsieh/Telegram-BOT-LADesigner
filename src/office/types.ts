import type { AccessRole } from "../security/accessControl.js";

export type MainCommand =
  | "help"
  | "do"
  | "find"
  | "read"
  | "make"
  | "status"
  | "cancel"
  | "project"
  | "list"
  | "revise"
  | "expand"
  | "workflow"
  | "save"
  | "auth"
  | "whoami"
  | "policy";

export type TaskType = "land" | "site" | "plant" | "cost" | "rfi" | "brief" | "review" | "check";

export type OutputType = "summary" | "report";

export type ParsedCommand = {
  command: MainCommand | "unknown";
  subcommand?: string;
  taskType?: TaskType;
  outputType?: OutputType;
  rawInput: string;
  args: string[];
};

export type RequestContext = {
  user_id?: number;
  username?: string;
  role: AccessRole;
  command: string;
  task_type?: string;
  raw_input: string;
  timestamp: string;
};

export type TaskStatus = "pending" | "done" | "cancelled" | "failed" | "report_generated";

export type DataSource = {
  id: string;
  label: string;
  type: "mock_project" | "mock_data" | "mock_search" | "mock_n8n" | "mock_nas";
};

export type ProjectContext = {
  project_id: string;
  name: string;
  project_type: string;
  location: string;
  stage: string;
  budget_level: string;
  client_preferences: string[];
  design_style: string[];
  known_constraints: string[];
  background_summary: string;
  mock_items: string[];
  source: string;
};

export type SearchResult = {
  id: string;
  type: string;
  title: string;
  summary: string;
  source: string;
};

export type TaskRecord = {
  job_id: string;
  command: string;
  task_type: string;
  raw_input: string;
  user_id?: number;
  username?: string;
  role: AccessRole;
  project_id?: string;
  data_mode: "mock";
  created_at: string;
  status: TaskStatus;
  task_data: unknown;
  ai_summary: string;
  report_generated: boolean;
  data_sources: DataSource[];
};

export type UserTaskContext = {
  last_task_id?: string;
  last_search_id?: string;
  last_read_id?: string;
  last_output_id?: string;
  current_project_id?: string;
};
