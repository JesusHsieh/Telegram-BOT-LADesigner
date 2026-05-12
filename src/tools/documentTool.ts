import { generateMarkdownReport } from "../office/officeAiClient.js";
import type { TaskRecord } from "../office/types.js";

export function generateDocument(task: TaskRecord, outputType: "summary" | "report"): string {
  return generateMarkdownReport(task, outputType);
}
