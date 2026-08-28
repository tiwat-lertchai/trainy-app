import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { auditMutations } from "./middleware/audit-mutations";
import { academicRoute } from "./modules/academic/academic.route";
import { attendanceRoute } from "./modules/attendance/attendance.route";
import { authRoute } from "./modules/auth/auth.route";
import { documentRoute } from "./modules/documents/document.route";
import { evaluationRoute } from "./modules/evaluations/evaluation.route";
import { healthRoute } from "./modules/health/health.route";
import { internshipRoute } from "./modules/internships/internship.route";
import { notificationRoute } from "./modules/notifications/notification.route";
import { onboardingRoute } from "./modules/onboarding/onboarding.route";
import { organizationRoute } from "./modules/organizations/organization.route";
import { placementRoute } from "./modules/placements/placement.route";
import { progressRoute } from "./modules/progress/progress.route";
import { reportRoute } from "./modules/reports/report.route";
import { rootRoute } from "./modules/root/root.route";

function createApp() {
  const app = new Hono();

  // Keep the logger first so every request is visible, including requests that
  // fail inside middleware registered later in the pipeline.
  app.use("*", logger());
  app.use("*", requestId());
  app.use("*", async (c, next) => {
    const documentUpload = c.req.method === "POST" && c.req.path === "/api/v1/documents";
    return bodyLimit({
      maxSize: documentUpload ? 21 * 1024 * 1024 : 1024 * 1024,
      onError: (c) =>
        c.json(
          {
            success: false,
            error: {
              code: "REQUEST_BODY_TOO_LARGE",
              message: documentUpload
                ? "Document upload exceeds the 20 MiB file limit"
                : "Request body exceeds the 1 MiB limit",
            },
          },
          413,
        ),
    })(c, next);
  });
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
  app.use("/api/v1/*", auditMutations);

  return app;
}

// Keep route registration chained. Hono uses the returned route type to build
// the RPC client type that is shared with the frontend.
export const app = createApp()
  .route("/", rootRoute)
  .route("/api/auth", authRoute)
  .route("/api/v1/academic", academicRoute)
  .route("/api/v1/attendance", attendanceRoute)
  .route("/api/v1/documents", documentRoute)
  .route("/api/v1/evaluations", evaluationRoute)
  .route("/api/v1/internships", internshipRoute)
  .route("/api/v1/notifications", notificationRoute)
  .route("/api/v1/onboarding", onboardingRoute)
  .route("/api/v1/organizations", organizationRoute)
  .route("/api/v1/placements", placementRoute)
  .route("/api/v1/progress-reports", progressRoute)
  .route("/api/v1/reports", reportRoute)
  .route("/api/v1/health", healthRoute);

export type AppType = typeof app;
