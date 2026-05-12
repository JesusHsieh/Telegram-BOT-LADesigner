import { generateTaskSummary } from "../office/officeAiClient.js";
import type { ProjectContext, TaskType } from "../office/types.js";

export async function draftTaskSummary(input: {
  taskType: TaskType;
  rawInput: string;
  taskData: unknown;
  project?: ProjectContext;
}): Promise<string> {
  return generateTaskSummary(input);
}
