import { logger } from "../utils/logger.js";

export function audit(event: string, data: Record<string, unknown>): void {
  logger.info(`AUDIT ${event}`, data);
}
