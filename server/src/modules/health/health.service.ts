import { sql } from "drizzle-orm";
import { db } from "../../db";

export function getLivenessStatus() {
  return {
    status: "ok" as const,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}

export async function getReadinessStatus() {
  // A real query verifies that the API can reach Neon and execute SQL. Merely
  // checking DATABASE_URL would not detect network or credential failures.
  await db.execute(sql`select 1`);

  return {
    status: "ready" as const,
    database: "connected" as const,
    timestamp: new Date().toISOString(),
  };
}
