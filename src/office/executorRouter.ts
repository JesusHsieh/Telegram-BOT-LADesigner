import { runN8nMockWorkflow, type N8nMockResult } from "../bridge/n8nMockBridge.js";
import { runNasMockOperation, type NasMockResult } from "../bridge/nasMockBridge.js";
import type { DataSource, ProjectContext, TaskType } from "./types.js";

export type ExecutorKind = "local" | "n8n_mock" | "nas_mock";

export type ExecutorResult = N8nMockResult | NasMockResult;

const n8nTasks = new Set<TaskType>(["brief", "rfi", "review", "check"]);
const nasTasks = new Set<TaskType>(["land", "site", "plant", "cost"]);

export function selectExecutors(taskType: TaskType): ExecutorKind[] {
  const executors: ExecutorKind[] = ["local"];
  if (n8nTasks.has(taskType)) executors.push("n8n_mock");
  if (nasTasks.has(taskType)) executors.push("nas_mock");
  return executors;
}

export async function runMockExecutors(input: {
  taskType: TaskType;
  rawInput: string;
  project?: ProjectContext;
}): Promise<ExecutorResult[]> {
  const executors = selectExecutors(input.taskType);
  const results: ExecutorResult[] = [];

  if (executors.includes("n8n_mock")) {
    results.push(await runN8nMockWorkflow(input));
  }

  if (executors.includes("nas_mock")) {
    results.push(await runNasMockOperation(input));
  }

  return results;
}

export function buildExecutorDataSources(results: ExecutorResult[]): DataSource[] {
  return results.map((result) =>
    result.bridge === "n8n"
      ? { id: result.workflow, label: "n8n Mock Workflow", type: "mock_n8n" }
      : { id: result.operation, label: "NAS Mock Bridge", type: "mock_nas" }
  );
}
