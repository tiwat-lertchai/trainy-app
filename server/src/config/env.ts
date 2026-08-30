const nodeEnvironments = ["development", "test", "production"] as const;
type NodeEnvironment = (typeof nodeEnvironments)[number];
const databaseDrivers = ["neon", "postgres"] as const;
type DatabaseDriver = (typeof databaseDrivers)[number];

function readNodeEnvironment(value: string | undefined): NodeEnvironment {
  if (nodeEnvironments.includes(value as NodeEnvironment)) {
    return value as NodeEnvironment;
  }

  return "development";
}

function readDatabaseDriver(value: string | undefined): DatabaseDriver {
  if (databaseDrivers.includes(value as DatabaseDriver)) {
    return value as DatabaseDriver;
  }

  return "neon";
}

function readPort(value: string | undefined): number {
  const port = Number(value ?? 3000);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return port;
}

function readRequired(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function readOrigins(value: string | undefined): readonly string[] {
  const configuredOrigins = (value ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins.length === 0) {
    throw new Error("CORS_ORIGINS must contain at least one origin");
  }

  const origins = configuredOrigins.map((origin) => {
    try {
      const parsed = new URL(origin);
      if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
        throw new Error();
      }
      return parsed.origin;
    } catch {
      throw new Error(`Invalid CORS origin: ${origin}`);
    }
  });

  return Object.freeze([...new Set(origins)]);
}

function readUrl(name: string, value: string | undefined): string {
  const url = readRequired(name, value);

  try {
    return new URL(url).origin;
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
}

export const env = Object.freeze({
  NODE_ENV: readNodeEnvironment(process.env.NODE_ENV),
  PORT: readPort(process.env.PORT),
  CORS_ORIGINS: readOrigins(process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN),
  DATABASE_URL: readRequired("DATABASE_URL", process.env.DATABASE_URL),
  DATABASE_DRIVER: readDatabaseDriver(process.env.DATABASE_DRIVER),
  BETTER_AUTH_SECRET: readRequired("BETTER_AUTH_SECRET", process.env.BETTER_AUTH_SECRET),
  BETTER_AUTH_URL: readUrl("BETTER_AUTH_URL", process.env.BETTER_AUTH_URL),
  LINE_CHANNEL_ID: readRequired("LINE_CHANNEL_ID", process.env.LINE_CHANNEL_ID),
  LINE_CHANNEL_SECRET: readRequired("LINE_CHANNEL_SECRET", process.env.LINE_CHANNEL_SECRET),
  UPLOAD_DIR: resolve(process.env.UPLOAD_DIR ?? "uploads"),
});
import { resolve } from "node:path";
