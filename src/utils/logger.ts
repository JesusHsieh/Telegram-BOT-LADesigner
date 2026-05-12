export const logger = {
  info(message: string, data?: unknown) {
    console.log(format("info", message, data));
  },
  warn(message: string, data?: unknown) {
    console.warn(format("warn", message, data));
  },
  error(message: string, data?: unknown) {
    console.error(format("error", message, data));
  }
};

function format(level: string, message: string, data?: unknown): string {
  const base = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
  if (data === undefined) return base;
  return `${base} ${safeJson(data)}`;
}

function safeJson(data: unknown): string {
  if (data instanceof Error) {
    return JSON.stringify({ name: data.name, message: data.message, stack: data.stack });
  }
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}
