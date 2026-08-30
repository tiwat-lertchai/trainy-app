import { beforeAll, describe, expect, it } from "bun:test";
import type { Hono } from "hono";

const trustedOrigin = "http://localhost:5173";
let app: Hono;

beforeAll(async () => {
  // Tests use a valid-looking URL because these security checks never query the
  // database. This keeps the suite independent from Neon and developer secrets.
  process.env.DATABASE_URL = "postgresql://test:test@localhost/test?sslmode=require";
  // Operators commonly include a trailing slash. URL origins never do, so the
  // configuration parser must canonicalize it before exact-match checks.
  process.env.CORS_ORIGINS = `${trustedOrigin}/`;
  process.env.BETTER_AUTH_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.LINE_CHANNEL_ID = "test-line-channel-id";
  process.env.LINE_CHANNEL_SECRET = "test-line-channel-secret";

  ({ app } = await import("./app"));
});

describe("cross-origin security", () => {
  it("allows credentials from an explicitly trusted origin", async () => {
    const response = await app.request("/", {
      headers: { Origin: trustedOrigin },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(trustedOrigin);
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  it("does not grant cross-origin access to an untrusted origin", async () => {
    const response = await app.request("/", {
      headers: { Origin: "https://attacker.example" },
    });

    expect(response.status).toBe(200);
    // Browsers require Access-Control-Allow-Origin before exposing a response.
    // The credentials header alone does not grant cross-origin access.
    expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
  });

  it("adds strict browser security headers", async () => {
    const response = await app.request("/");

    expect(response.headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("same-origin");
    expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Content-Security-Policy")).toContain("default-src 'none'");
    expect(response.headers.get("Permissions-Policy")).toContain("geolocation=()");
  });
});

describe("authentication routes", () => {
  it("mounts the Better Auth handler", async () => {
    const response = await app.request("/api/auth/get-session");

    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });
});

describe("organization routes", () => {
  it("rejects unauthenticated requests", async () => {
    const response = await app.request("/api/v1/organizations");
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
  });
});

describe("onboarding routes", () => {
  it("rejects unauthenticated onboarding and review access", async () => {
    const [mine, reviews] = await Promise.all([
      app.request("/api/v1/onboarding/me"),
      app.request("/api/v1/onboarding/reviews"),
    ]);
    expect(mine.status).toBe(401);
    expect(reviews.status).toBe(401);
  });
});

describe("internship routes", () => {
  it("rejects unauthenticated requests before exposing internship data", async () => {
    const response = await app.request("/api/v1/internships");
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
  });
});

describe("placement routes", () => {
  it("rejects unauthenticated placement access", async () => {
    const response = await app.request("/api/v1/placements/me");
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
  });
});

describe("academic routes", () => {
  it("rejects unauthenticated faculty and major access", async () => {
    const [faculties, majors] = await Promise.all([
      app.request("/api/v1/academic/00000000-0000-4000-8000-000000000000/faculties"),
      app.request("/api/v1/academic/faculties/00000000-0000-4000-8000-000000000000/majors"),
    ]);
    expect(faculties.status).toBe(401);
    expect(majors.status).toBe(401);
  });
});

describe("attendance routes", () => {
  it("rejects unauthenticated attendance access", async () => {
    const [schedule, records, summary] = await Promise.all([
      app.request("/api/v1/attendance/00000000-0000-4000-8000-000000000000/schedule"),
      app.request("/api/v1/attendance/00000000-0000-4000-8000-000000000000"),
      app.request(
        "/api/v1/attendance/organizations/00000000-0000-4000-8000-000000000000/summary?from=2026-10-01&to=2026-10-31",
      ),
    ]);
    expect(schedule.status).toBe(401);
    expect(records.status).toBe(401);
    expect(summary.status).toBe(401);
  });
});

describe("progress report routes", () => {
  it("rejects unauthenticated progress report access", async () => {
    const response = await app.request(
      "/api/v1/progress-reports/placements/00000000-0000-4000-8000-000000000000",
    );
    expect(response.status).toBe(401);
  });
});

describe("document and evaluation routes", () => {
  it("rejects unauthenticated workflow access", async () => {
    const [documents, evaluations] = await Promise.all([
      app.request("/api/v1/documents/placements/00000000-0000-4000-8000-000000000000"),
      app.request("/api/v1/evaluations/placements/00000000-0000-4000-8000-000000000000"),
    ]);
    expect(documents.status).toBe(401);
    expect(evaluations.status).toBe(401);
  });
  it("allows document upload bodies above the generic limit but caps oversized files", async () => {
    const accepted = new FormData();
    accepted.set("placementId", "00000000-0000-4000-8000-000000000000");
    accepted.set("type", "consent");
    accepted.set(
      "file",
      new File([new Uint8Array(2 * 1024 * 1024)], "document.pdf", { type: "application/pdf" }),
    );
    const oversized = new FormData();
    oversized.set("placementId", "00000000-0000-4000-8000-000000000000");
    oversized.set("type", "consent");
    oversized.set(
      "file",
      new File([new Uint8Array(22 * 1024 * 1024)], "document.pdf", { type: "application/pdf" }),
    );
    expect(
      (await app.request("/api/v1/documents", { method: "POST", body: accepted })).status,
    ).toBe(401);
    expect(
      (await app.request("/api/v1/documents", { method: "POST", body: oversized })).status,
    ).toBe(413);
  });
});

describe("platform service routes", () => {
  it("rejects unauthenticated notification and report access", async () => {
    const [notifications, reports] = await Promise.all([
      app.request("/api/v1/notifications"),
      app.request("/api/v1/reports/organizations/00000000-0000-4000-8000-000000000000"),
    ]);
    expect(notifications.status).toBe(401);
    expect(reports.status).toBe(401);
  });
});
