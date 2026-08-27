import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
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
    // remains the production driver and uses its serverless HTTP transport.
    const client = postgres(env.DATABASE_URL, { max: 5 });
    closeConnection = async () => client.end();

    return drizzlePostgres({ client, schema });
  }

  const sql = neon(env.DATABASE_URL);

  return drizzle({ client: sql, schema });
}

// Keep one database instance so services do not create independent connection
// pools. Tests can close the local TCP driver through closeDatabase().
export const db = createDatabase();

export async function closeDatabase() {
  await closeConnection();
}
