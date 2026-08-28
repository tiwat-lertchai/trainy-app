import { beforeAll, describe, expect, it } from "bun:test";
import type { Hono } from "hono";

const trustedOrigin = "http://localhost:5173";
let app: Hono;

beforeAll(async () => {
  // Tests use a valid-looking URL because these security checks never query the
  // database. This keeps the suite independent from Neon and developer secrets.
  process.env.DATABASE_URL =
    "postgresql://test:test@localhost/test?sslmode=require";
  process.env.CORS_ORIGINS = trustedOrigin;
  process.env.BETTER_AUTH_SECRET =
    "test-secret-that-is-longer-than-thirty-two-characters";
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
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      trustedOrigin,
    );
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
      "true",
    );
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

    expect(response.headers.get("Cross-Origin-Opener-Policy")).toBe(
      "same-origin",
    );
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe(
      "same-origin",
    );
    expect(response.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
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
      app.request(
        "/api/v1/documents/placements/00000000-0000-4000-8000-000000000000",
      ),
      app.request(
        "/api/v1/evaluations/placements/00000000-0000-4000-8000-000000000000",
      ),
    ]);
    expect(documents.status).toBe(401);
    expect(evaluations.status).toBe(401);
  });
});

describe("platform service routes", () => {
  it("rejects unauthenticated notification and report access", async () => {
    const [notifications, reports] = await Promise.all([
      app.request("/api/v1/notifications"),
      app.request(
        "/api/v1/reports/organizations/00000000-0000-4000-8000-000000000000",
      ),
    ]);
    expect(notifications.status).toBe(401);
    expect(reports.status).toBe(401);
  });
});
