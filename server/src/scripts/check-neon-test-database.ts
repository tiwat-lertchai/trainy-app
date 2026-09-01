import { Pool } from "@neondatabase/serverless";

type NeonTargetInput = {
  databaseUrl?: string;
  databaseDriver?: string;
  databaseEnvironment?: string;
  expectedHost?: string;
  allowProductionReset?: string;
};

export function validateNeonTestTarget(input: NeonTargetInput) {
  const databaseUrl = input.databaseUrl?.trim();
  const expectedHost = input.expectedHost?.trim().toLowerCase();
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (input.databaseDriver !== "neon") {
    throw new Error("DATABASE_DRIVER must be neon for the Neon test database workflow");
  }
  const resettableProduction =
    input.databaseEnvironment === "production-resettable" && input.allowProductionReset === "true";
  if (input.databaseEnvironment !== "test" && !resettableProduction) {
    throw new Error(
      "DATABASE_ENVIRONMENT must be test, or production-resettable with NEON_ALLOW_PRODUCTION_RESET=true",
    );
  }
  if (!expectedHost) {
    throw new Error("NEON_TEST_HOST is required and must match the selected Neon test branch host");
  }

  const parsed = new URL(databaseUrl);
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol");
  }
  if (!parsed.hostname.toLowerCase().endsWith(".neon.tech")) {
    throw new Error("DATABASE_URL must point to a neon.tech host");
  }
  if (parsed.hostname.toLowerCase() !== expectedHost) {
    throw new Error("DATABASE_URL host does not match NEON_TEST_HOST");
  }
  if (parsed.searchParams.get("sslmode") !== "require") {
    throw new Error("Neon DATABASE_URL must include sslmode=require");
  }
  return { databaseUrl, hostname: parsed.hostname, environment: input.databaseEnvironment };
}

if (import.meta.main) {
  const target = validateNeonTestTarget({
    databaseUrl: process.env.DATABASE_URL,
    databaseDriver: process.env.DATABASE_DRIVER,
    databaseEnvironment: process.env.DATABASE_ENVIRONMENT,
    expectedHost: process.env.NEON_TEST_HOST,
    allowProductionReset: process.env.NEON_ALLOW_PRODUCTION_RESET,
  });
  const pool = new Pool({ connectionString: target.databaseUrl });
  try {
    const result = await pool.query<{ database_name: string; current_user: string }>(
      "select current_database() as database_name, current_user",
    );
    const identity = result.rows[0];
    if (!identity) throw new Error("Neon did not return a database identity");
    console.log(
      JSON.stringify({
        status: "connected",
        provider: "neon",
        environment: target.environment,
        host: target.hostname,
        database: identity.database_name,
        user: identity.current_user,
      }),
    );
  } finally {
    await pool.end();
  }
}
