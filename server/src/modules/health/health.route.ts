import { Hono } from "hono";
import { AppError } from "../../lib/app-error";
import {
  getLivenessStatus,
  getReadinessStatus,
} from "./health.service";

export const healthRoute = new Hono().get("/", (c) => {
  return c.json(getLivenessStatus());
}).get("/ready", async (c) => {
  try {
    return c.json(await getReadinessStatus());
  } catch (error) {
    console.error({ error }, "Database readiness check failed");

    throw new AppError(
      "Database is unavailable",
      503,
      "DATABASE_UNAVAILABLE",
    );
  }
});
