import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "../config/env";
import * as schema from "./schema";

// Keep the driver and Drizzle instance here so services share one configured
// database entry point instead of creating connections throughout the codebase.
const sql = neon(env.DATABASE_URL);

export const db = drizzle({ client: sql, schema });
