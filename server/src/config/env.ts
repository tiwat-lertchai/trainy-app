const nodeEnvironments = ["development", "test", "production"] as const;
type NodeEnvironment = (typeof nodeEnvironments)[number];

function readNodeEnvironment(value: string | undefined): NodeEnvironment {
  if (nodeEnvironments.includes(value as NodeEnvironment)) {
    return value as NodeEnvironment;
  }

  return "development";
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

export const env = Object.freeze({
  NODE_ENV: readNodeEnvironment(process.env.NODE_ENV),
  PORT: readPort(process.env.PORT),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  DATABASE_URL: readRequired("DATABASE_URL", process.env.DATABASE_URL),
});
