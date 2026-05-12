import { getAccessRole, type TelegramUserContext } from "../security/accessControl.js";
import type { MainCommand, OutputType, ParsedCommand, RequestContext, TaskType } from "./types.js";

export const taskTypes: TaskType[] = ["land", "site", "plant", "cost", "rfi", "brief", "review", "check"];
const mainCommands = new Set([
  "help",
  "do",
  "find",
  "read",
  "make",
  "status",
  "cancel",
  "project",
  "list",
  "revise",
  "expand",
  "workflow",
  "save",
  "auth",
  "whoami",
  "policy"
]);
const outputTypes = new Set(["summary", "report"]);

export function parseOfficeCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  const match = trimmed.match(/^\/([a-zA-Z_]+)(?:@\w+)?(?:\s+(.*))?$/s);

  if (!match) {
    return { command: "unknown", rawInput: trimmed, args: splitArgs(trimmed) };
  }

  const command = match[1].toLowerCase();
  const content = (match[2] ?? "").trim();
  const args = splitArgs(content);

  if (!mainCommands.has(command)) {
    return { command: "unknown", rawInput: trimmed, args: splitArgs(trimmed) };
  }

  if (command === "do") {
    const maybeTaskType = args[0]?.toLowerCase();
    return {
      command,
      taskType: taskTypes.includes(maybeTaskType as TaskType) ? (maybeTaskType as TaskType) : undefined,
      rawInput: args.slice(1).join(" ").trim(),
      args
    };
  }

  if (command === "make") {
    const maybeOutputType = args[0]?.toLowerCase();
    return {
      command,
      outputType: outputTypes.has(maybeOutputType) ? (maybeOutputType as OutputType) : undefined,
      rawInput: args.slice(1).join(" ").trim(),
      args
    };
  }

  if (command === "project" || command === "list") {
    return {
      command: command as MainCommand,
      subcommand: args[0]?.toLowerCase(),
      rawInput: args.slice(1).join(" ").trim(),
      args
    };
  }

  return {
    command: command as MainCommand,
    rawInput: content,
    args
  };
}

export function createRequestContext(parsed: ParsedCommand, user: TelegramUserContext): RequestContext {
  return {
    user_id: user.id,
    username: user.username,
    role: getAccessRole(user),
    command: parsed.command,
    task_type: parsed.taskType ?? parsed.outputType ?? parsed.subcommand,
    raw_input: parsed.rawInput,
    timestamp: new Date().toISOString()
  };
}

function splitArgs(value: string): string[] {
  return value ? value.split(/\s+/).filter(Boolean) : [];
}
