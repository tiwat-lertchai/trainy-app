import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { healthRoute } from "./modules/health/health.route";
import { rootRoute } from "./modules/root/root.route";

function createApp() {
  const app = new Hono();

  // Keep the logger first so every request is visible, including requests that
  // fail inside middleware registered later in the pipeline.
  app.use("*", logger());
  app.use("*", requestId());
  app.use(
    "*",
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.onError(errorHandler);

  return app;
}

// Keep route registration chained. Hono uses the returned route type to build
// the RPC client type that is shared with the frontend.
export const app = createApp()
  .route("/", rootRoute)
  .route("/api/v1/health", healthRoute);

export type AppType = typeof app;
