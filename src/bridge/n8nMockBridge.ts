import type { ProjectContext, TaskType } from "../office/types.js";

export type N8nMockResult = {
  bridge: "n8n";
  mode: "mock";
  workflow: string;
  handled: boolean;
  summary: string;
  next_action?: string;
};

const workflowByTask: Partial<Record<TaskType, string>> = {
  brief: "mock-ai-brief-workflow",
  rfi: "mock-rfi-draft-workflow",
  review: "mock-review-checklist-workflow",
  check: "mock-site-check-workflow"
};

export async function runN8nMockWorkflow(input: {
  taskType: TaskType;
  rawInput: string;
  project?: ProjectContext;
}): Promise<N8nMockResult> {
  const workflow = workflowByTask[input.taskType] ?? "mock-general-ai-workflow";
  return {
    bridge: "n8n",
    mode: "mock",
    workflow,
    handled: true,
    summary: [
      `n8n mock workflow: ${workflow}`,
      `task_type: ${input.taskType}`,
      `project: ${input.project?.project_id ?? "not_set"}`,
      `input: ${input.rawInput || "empty"}`
    ].join("\n"),
    next_action: "Return draft result to Task Router."
  };
}
