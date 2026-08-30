import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { errorHandler } from "./error-handler";
import { apiRateLimit } from "./rate-limit";

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler);
  app.use("*", apiRateLimit);
  app.get("/", (c) => c.json({ ok: true }));
  return app;
}

describe("rate limit middleware", () => {
  test("allows requests under the limit", async () => {
    const app = buildApp();
    const res = await app.request("/", { headers: { "x-real-ip": "203.0.113.1" } });
    expect(res.status).toBe(200);
  });

  test("rejects once a single client exceeds the window budget", async () => {
    const app = buildApp();
    const ip = "203.0.113.2";
    let lastStatus = 0;
    for (let i = 0; i < 301; i++) {
      const res = await app.request("/", { headers: { "x-real-ip": ip } });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });

  test("tracks separate clients independently", async () => {
    const app = buildApp();
    const first = await app.request("/", { headers: { "x-real-ip": "203.0.113.3" } });
    const second = await app.request("/", { headers: { "x-real-ip": "203.0.113.4" } });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });

  test("sets Retry-After once the limit is hit", async () => {
    const app = buildApp();
    const ip = "203.0.113.5";
    let last: Response | undefined;
    for (let i = 0; i < 301; i++) {
      last = await app.request("/", { headers: { "x-real-ip": ip } });
    }
    expect(last?.headers.get("Retry-After")).toBeTruthy();
  });
});
