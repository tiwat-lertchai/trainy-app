import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { getConnInfo } from "hono/bun";
import { AppError } from "../lib/app-error";

/**
 * Minimal in-memory fixed-window rate limiter. No external dependency and no
 * shared store, so it only protects a single server process — see
 * `summarize/` for the tradeoff this accepts (documented at the call sites in
 * app.ts). Good enough to blunt scripted brute-force/abuse against a
 * single-instance deployment; revisit with a shared store (e.g. Redis) before
 * running more than one server replica.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

function createLimiter(options: { windowMs: number; max: number; name: string }) {
  const buckets = new Map<string, Bucket>();

  // Bound memory: sweep expired buckets every window instead of growing
  // forever under a distributed scan/scrape.
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, options.windowMs).unref();

  return createMiddleware(async (c, next) => {
    const key = clientKey(c);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      await next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > options.max) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      c.header("Retry-After", String(retryAfterSeconds));
      throw new AppError(
        `Too many requests to ${options.name}. Try again later.`,
        429,
        "RATE_LIMITED",
      );
    }

    await next();
  });
}

function clientKey(c: Context) {
  // Trusted only because the production topology (compose.yaml) never
  // exposes the server directly — nginx is the sole entry point and sets
  // this header from its own $remote_addr, so it cannot be spoofed by an
  // external client in that deployment. If the server is ever exposed
  // directly (no reverse proxy in front of it), this header becomes
  // attacker-controlled and must not be trusted as-is.
  const proxied = c.req.header("x-real-ip");
  if (proxied) return proxied;

  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    return "unknown";
  }
}

// Sign-in/callback abuse (credential stuffing, OAuth state/CSRF probing):
// tight per-IP budget.
export const authRateLimit = createLimiter({
  windowMs: 60_000,
  max: 20,
  name: "authentication",
});

// General API abuse/scraping backstop. Generous enough not to bother normal
// interactive use (dashboards poll, forms submit), tight enough to blunt a
// scripted loop against a single-instance deployment.
export const apiRateLimit = createLimiter({
  windowMs: 60_000,
  max: 300,
  name: "the API",
});
