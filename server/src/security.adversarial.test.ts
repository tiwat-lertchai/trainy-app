import { beforeAll, describe, expect, test } from "bun:test";
import type { Hono } from "hono";

let app: Hono;
beforeAll(async () => {
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@localhost/test?sslmode=require",
    CORS_ORIGINS: "http://localhost:5173",
    BETTER_AUTH_SECRET: "test-secret-that-is-longer-than-thirty-two-characters",
    BETTER_AUTH_URL: "http://localhost:3000",
    LINE_CHANNEL_ID: "test-line-channel-id",
    LINE_CHANNEL_SECRET: "test-line-channel-secret",
  });
  ({ app } = await import("./app"));
});

describe("local adversarial API checks", () => {
  test("rejects a request body larger than 1 MiB", async () => {
    const response = await app.request(
      "/api/v1/internships/companies/00000000-0000-4000-8000-000000000000",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: "x".repeat(1024 * 1024 + 1) }),
      },
    );
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      error: { code: "REQUEST_BODY_TOO_LARGE" },
    });
  });

  test("does not expose credentialed responses to an attacker origin", async () => {
    const response = await app.request("/api/v1/notifications", {
      headers: {
        Origin: "https://attacker.example",
        Cookie: "better-auth.session_token=fake",
      },
    });
    expect(response.status).toBe(401);
    expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
  });

  test("rejects unauthenticated mutations before domain processing", async () => {
    const response = await app.request("/api/v1/placements/not-a-uuid/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    expect(response.status).toBe(401);
  });
});
