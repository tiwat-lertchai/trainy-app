import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";
import postgres from "postgres";
import { env } from "../config/env";
import * as schema from "./schema";

export type Database = PgDatabase<any, typeof schema>;

let closeConnection: () => Promise<void> = async () => {};

function createDatabase(): Database {
  if (env.DATABASE_DRIVER === "postgres") {
    // The TCP driver is used only for local Docker and integration tests. Neon
    // remains the production driver and uses its serverless WebSocket pool.
    const client = postgres(env.DATABASE_URL, { max: 5 });
    closeConnection = async () => client.end();

    return drizzlePostgres({ client, schema });
  }

  // The WebSocket pool driver is required here instead of neon-http: several
  // repositories rely on real transactions (onboarding approval, internship
  // capacity, organization admin changes, attendance schedule/adjustment
  // review), and Neon's stateless HTTP driver does not support db.transaction()
  // at all — every call throws "No transactions support in neon-http driver".
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  closeConnection = async () => pool.end();

  return drizzle({ client: pool, schema });
}

// Keep one database instance so services do not create independent connection
// pools. Tests can close the local TCP driver through closeDatabase().
export const db = createDatabase();

export async function closeDatabase() {
  await closeConnection();
}
