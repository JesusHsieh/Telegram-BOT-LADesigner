import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

type SecurityConfig = {
  trustedUserIds: number[];
};

const configPath = join(process.cwd(), "data", "security_config.json");

export function getTrustedUserIds(): Set<number> {
  return new Set(readSecurityConfig().trustedUserIds);
}

export function listTrustedUserIds(): number[] {
  return readSecurityConfig().trustedUserIds;
}

export function addTrustedUserId(userId: number): number[] {
  const config = readSecurityConfig();
  if (!config.trustedUserIds.includes(userId)) {
    config.trustedUserIds.push(userId);
    config.trustedUserIds.sort((a, b) => a - b);
    writeSecurityConfig(config);
  }
  return config.trustedUserIds;
}

export function removeTrustedUserId(userId: number): number[] {
  const config = readSecurityConfig();
  config.trustedUserIds = config.trustedUserIds.filter((id) => id !== userId);
  writeSecurityConfig(config);
  return config.trustedUserIds;
}

function readSecurityConfig(): SecurityConfig {
  if (!existsSync(configPath)) {
    const initialConfig: SecurityConfig = { trustedUserIds: [] };
    writeSecurityConfig(initialConfig);
    return initialConfig;
  }

  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8")) as Partial<SecurityConfig>;
    return {
      trustedUserIds: normalizeUserIds(parsed.trustedUserIds)
    };
  } catch {
    return { trustedUserIds: [] };
  }
}

function writeSecurityConfig(config: SecurityConfig): void {
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(
    configPath,
    `${JSON.stringify({ trustedUserIds: normalizeUserIds(config.trustedUserIds) }, null, 2)}\n`,
    "utf8"
  );
}

function normalizeUserIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is number => Number.isInteger(id) && id > 0))].sort((a, b) => a - b);
}
