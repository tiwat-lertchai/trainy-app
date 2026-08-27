import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { authRoute } from "./modules/auth/auth.route";
import { healthRoute } from "./modules/health/health.route";
import { organizationRoute } from "./modules/organizations/organization.route";
import { rootRoute } from "./modules/root/root.route";

function createApp() {
  const app = new Hono();

  // Keep the logger first so every request is visible, including requests that
  // fail inside middleware registered later in the pipeline.
  app.use("*", logger());
  app.use("*", requestId());
  app.use(
    "*",
    secureHeaders({
      crossOriginOpenerPolicy: "same-origin",
      crossOriginResourcePolicy: "same-origin",
      referrerPolicy: "strict-origin-when-cross-origin",
      strictTransportSecurity: "max-age=31536000; includeSubDomains",
      xContentTypeOptions: "nosniff",
      xFrameOptions: "DENY",
    }),
  );
  app.use(
    "*",
    cors({
      // Echo only an explicitly trusted origin. A wildcard cannot be used with
      // credentialed Better Auth requests.
      origin: (origin) =>
        env.CORS_ORIGINS.includes(origin) ? origin : undefined,
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type"],
      credentials: true,
      maxAge: 86_400,
    }),
  );
  app.onError(errorHandler);

  return app;
}

// Keep route registration chained. Hono uses the returned route type to build
// the RPC client type that is shared with the frontend.
export const app = createApp()
  .route("/", rootRoute)
  .route("/api/auth", authRoute)
  .route("/api/v1/organizations", organizationRoute)
  .route("/api/v1/health", healthRoute);

export type AppType = typeof app;
