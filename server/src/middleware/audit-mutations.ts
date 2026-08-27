import { createMiddleware } from "hono/factory";
import { db } from "../db";
import { auditEvent } from "../db/schema";
import type { AuthUser } from "./require-auth";
import { isAuditedMethod } from "./audit-method";

export const auditMutations = createMiddleware<{
  Variables: { authUser?: AuthUser; requestId?: string };
}>(async (c, next) => {
  await next();
  if (!isAuditedMethod(c.req.method)) return;
  const actor = c.get("authUser");
  // The request logger already captures rejected anonymous traffic. Persisted
  // domain audit events are reserved for authenticated state changes.
  if (!actor) return;

  const segments = new URL(c.req.url).pathname.split("/").filter(Boolean);
  try {
    await db.insert(auditEvent).values({
      actorUserId: actor.id,
      action: `${c.req.method.toUpperCase()} ${c.req.path}`,
      entityType: segments[2] ?? "api",
      entityId: segments.at(-1) ?? null,
      requestId: c.get("requestId") ?? c.res.headers.get("X-Request-Id"),
      metadata: { status: c.res.status },
    });
  } catch (error) {
    // Audit storage is best-effort at middleware level. Domain transactions
    // remain authoritative, and infrastructure monitoring must alert on this.
    console.error("Failed to persist API audit event", error);
  }
});
