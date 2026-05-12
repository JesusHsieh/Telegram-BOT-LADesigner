import type { ProjectContext, TaskType } from "../office/types.js";

export type NasMockResult = {
  bridge: "nas";
  mode: "mock";
  operation: string;
  handled: boolean;
  summary: string;
};

const operationByTask: Partial<Record<TaskType, string>> = {
  land: "mock-project-folder-lookup",
  site: "mock-site-data-read",
  plant: "mock-plant-library-lookup",
  cost: "mock-cost-table-lookup"
};

export async function runNasMockOperation(input: {
  taskType: TaskType;
  rawInput: string;
  project?: ProjectContext;
}): Promise<NasMockResult> {
  const operation = operationByTask[input.taskType] ?? "mock-project-context-lookup";
  return {
    bridge: "nas",
    mode: "mock",
    operation,
    handled: true,
    summary: [
      `NAS mock operation: ${operation}`,
      `task_type: ${input.taskType}`,
      `project: ${input.project?.project_id ?? "not_set"}`,
      `input: ${input.rawInput || "empty"}`
    ].join("\n")
  };
}
