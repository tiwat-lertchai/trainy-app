import { describe, expect, test } from "bun:test";

const apiReferenceUrl = new URL("../docs/api-reference.md", import.meta.url);
const readmeUrl = new URL("../README.md", import.meta.url);

// Keep this list at the route-family level. Individual request and workflow
// details remain readable in the reference while this test catches an omitted
// module whenever the frontend contract is reorganized.
const documentedRouteFamilies = [
  "/api/auth/*",
  "/api/v1/health/ready",
  "/api/v1/organizations",
  "/api/v1/internships",
  "/applications/:applicationId/status",
  "/api/v1/placements",
  "/:placementId/advisor",
  "/:placementId/supervisor",
  "/api/v1/progress-reports",
  "/:reportId/submit",
  "/:reportId/review",
  "/api/v1/documents",
  "/:documentId/review",
  "/api/v1/evaluations",
  "/:evaluationId/submit",
  "/api/v1/notifications",
  "/:notificationId/read",
  "/api/v1/reports/organizations/:organizationId",
] as const;

describe("API documentation", () => {
  test("covers every public route family used by the frontend", async () => {
    const apiReference = await Bun.file(apiReferenceUrl).text();

    for (const route of documentedRouteFamilies) {
      expect(apiReference, `Missing API documentation for ${route}`).toContain(
        route,
      );
    }
  });

  test("is discoverable from the server README", async () => {
    const readme = await Bun.file(readmeUrl).text();

    // Assert the link target rather than its label so the README can be localized.
    expect(readme).toContain("](docs/api-reference.md)");
  });
});
