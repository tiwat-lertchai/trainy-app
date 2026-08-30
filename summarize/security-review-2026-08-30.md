# Security review, 2026-08-30: regression check + rate limiting

## Scope and outcome

Requested as a general "security test and handle everything" pass, read
against `AGENTS.md` rule 11 (security is a primary requirement) and rule 13
(self-pentest gate before shipping security-relevant changes). This session
had **no shell access to the development machine** (no `device_bash`-class
tool was available for the linked device), so the dynamic, hands-on parts of
rule 13's established pattern — a disposable Kali container against a
running dev/production stack — could **not** be run this round. This is a
capability gap in this session, not a decision to skip the step; see
"Not done this round" below.

What this round actually did:

1. Read every existing `summarize/*pentest*`, `summarize/*security*` file
   and the current `server/src/app.ts`, `config/env.ts`, `middleware/*`,
   `modules/auth/auth.ts`, `modules/documents/*`, `compose.yaml`, and
   `client/nginx.conf` to regression-check prior fixes against the code as
   it exists today.
2. Added a missing control identified as an open gap in
   `summarize/remaining-work-2026-08-31.md` ("public-endpoint rate
   limiting"): a minimal in-memory rate limiter.

## Regression check (static read only) — all previously fixed issues still hold

- CORS: `app.ts` still echoes only an explicitly trusted, canonicalized
  origin (`config/env.ts`'s `readOrigins` normalizes trailing slashes via
  `new URL(...).origin`); credentials + no wildcard, matching
  `security-pass-cors-lockfile.md`.
- Security headers: `secureHeaders()` still sets a strict CSP
  (`default-src 'none'`), Permissions-Policy, HSTS, X-Frame-Options: DENY,
  nosniff, COOP/CORP, matching `localhost-pentest-owasp.md`'s fix. The
  client's `nginx.conf` carries the equivalent CSP for the static SPA
  (`default-src 'self'`), closing that pentest's "client still open" note.
- Cookies: `modules/auth/auth.ts` sets `httpOnly`, `secure` in production,
  `sameSite: "lax"` — consistent with the documented OAuth-redirect
  rationale.
- Auth boundary: every `/api/v1/*` route file still chains
  `.use("*", requireAuth)` before any handler; `require-auth.ts` unchanged
  and still throws a real `401` via Better Auth's session check.
- Document storage (`document-storage.ts`): `resolveKey()` still rejects any
  resolved path that doesn't stay strictly under the upload root — path
  traversal via a crafted storage key is still blocked. Upload also checks
  the file's magic bytes against its declared MIME type
  (`hasExpectedSignature`) before accepting it, and download/list/review
  all re-check placement membership (student/advisor/supervisor) — no gap
  found here.
- Docker exposure: `compose.yaml` still publishes only the client's port
  `8081`; `server` and `db` have no host port mapping, consistent with the
  nmap-verified finding in `security-pass-cors-lockfile.md`.
- Dependencies: could not re-run `bun audit` / OSV-Scanner this round (no
  shell). `server/package.json` and root `package.json` show the same
  `esbuild` override and pinned `hono@4.13.5` recorded as clean in the last
  two dependency passes; no lockfile was touched this round, so that
  result should still hold, but this is inference from reading files, not
  a fresh scan.

**No regressions found in what could be statically re-checked.**

## New finding and fix: no rate limiting on any endpoint

- **Severity:** Medium (availability / brute-force, not a data-exposure
  bug).
- **Where:** `server/src/app.ts` — no request-rate control existed on
  `/api/auth/*` (LINE OAuth sign-in/callback) or any `/api/v1/*` route.
  This was already self-identified as an open gap in
  `summarize/remaining-work-2026-08-31.md` ("Production operations:
  ...public-endpoint rate limiting").
- **Risk:** an anonymous client could hammer the sign-in/callback flow or
  scrape/abuse any authenticated-but-cheap-to-call endpoint (e.g. session
  checks, list endpoints) without any per-client throttle, since Better
  Auth's own session verification and Drizzle's parameterized queries don't
  by themselves limit request *volume*.
- **Fix (added, see files below):** a dependency-free, in-memory
  fixed-window limiter (`server/src/middleware/rate-limit.ts`):
  - `authRateLimit`: 20 requests/minute per client, mounted on
    `/api/auth/*`.
  - `apiRateLimit`: 300 requests/minute per client, mounted on
    `/api/v1/*`.
  - Returns `429 RATE_LIMITED` with a `Retry-After` header once exceeded.
  - Client key: `X-Real-IP` when present, else the raw connection address
    (`hono/bun`'s `getConnInfo`), else `"unknown"`.
  - Skipped entirely when `NODE_ENV === "test"` (see "Why gated out of
    tests" below).
  - New test file: `server/src/middleware/rate-limit.test.ts` (4 cases:
    under-limit allowed, over-limit rejected, independent clients tracked
    separately, `Retry-After` present on rejection).

### Explicit limitations of this fix

- **In-memory only.** State lives in one process's `Map`; it does **not**
  coordinate across multiple server replicas. `compose.yaml` currently runs
  exactly one `server` instance, so this holds today, but must be replaced
  with a shared store (e.g. Redis) before horizontal scaling — otherwise
  each replica gets its own independent budget, weakening the limit by a
  factor of the replica count.
- **IP-header trust boundary.** `X-Real-IP` is only safe to trust because
  `compose.yaml` never publishes the server's port directly — `nginx` is
  the sole entry point and sets that header from its own `$remote_addr`
  (confirmed in `client/nginx.conf`), so an external client cannot spoof it
  in that topology. If the server is ever exposed directly (no reverse
  proxy in front, e.g. a bare `bun run start` reachable from the network),
  this header becomes attacker-controlled and the limiter would need a
  different trust model.
- **Coarse, not adaptive.** This is a flat per-client budget, not
  progressive backoff, CAPTCHA, or account lockout. It blunts scripted
  brute force; it does not stop a slow, low-and-slow attacker.
- **Why gated out of `NODE_ENV=test`:** the limiter's counters are a
  module-level singleton shared by every test file that imports
  `server/src/app.ts` in the same `bun test` process (`app.test.ts`,
  `security.adversarial.test.ts`, `api-documentation.test.ts`). Those
  files were written assuming no request budget, and Bun's test runner
  already sets `NODE_ENV=test` by default, so gating on that value avoids
  making the existing suite flaky without needing to touch those files.
  The new `rate-limit.test.ts` exercises the limiter directly (its own
  throwaway `Hono` app), independent of that gate.

## Follow-up session (2026-08-31): full verification chain + live self-pentest

This session had real shell/Docker access and completed everything the prior
round flagged as blocked.

### Static verification (all green)

- `bun install` — 251 installs across 330 packages, no changes.
- `bun run type-check` — passes (`shared`, `server`; `client` has no
  standalone type-check script, its `tsc -b` runs as part of `build`).
- `bun run lint` — passes (`client` eslint; `server`/`shared` have no lint
  script of their own).
- `bun run test` — **153 pass, 0 fail**, 241 `expect()` calls across 21
  files, including the 4 new `rate-limit.test.ts` cases
  (under-limit/over-limit/independent-clients/`Retry-After`). `hono/bun`'s
  `getConnInfo` import resolved cleanly against the installed Hono version —
  the one previously-unverified API surface.
- `bun run build` — server `tsc` and client `vite build` both succeed.
- `bun audit` — no vulnerabilities found (310 packages checked).

### Live self-pentest (AGENTS.md rule 13)

The prior round's disposable-Kali-container step was attempted but blocked
by this session's auto-mode classifier (`docker run` for a fresh
`kalilinux/kali-rolling` container was denied). Verification was instead
done with plain `curl`/`docker exec`/`docker compose` against the real
**production** Compose stack (`docker compose up -d --build`), which is
closer to the deployed topology than the dev servers anyway:

- **Server port genuinely unreachable from the host**: `curl` to
  `localhost:3000` fails to connect (no published port, confirmed in
  `compose.yaml`); `docker exec` into the `client` container to hit
  `server:3000` directly over the internal Compose network succeeds (`401`,
  correctly rejecting the unauthenticated request) — the server is only
  reachable via nginx, matching the limiter's trust-model assumption.
- **`authRateLimit` fires exactly at the configured budget**: 25 requests to
  `/api/auth/session` through the real nginx entrypoint (`:8081`) returned
  `404` (expected — no session) for the first 20, then `429` for requests
  21–25.
- **`Retry-After` header present on rejection**: confirmed via `curl -D -`,
  e.g. `Retry-After: 42`.
- **`X-Real-IP` spoofing genuinely fails in this topology**: sending
  `X-Real-IP: 9.9.9.9` as an external client did **not** reset the budget
  (still got `429`, not a fresh `404`) — nginx overwrites the header from
  its own `$remote_addr` before proxying, so the header is not
  client-controlled in the deployed topology, confirming the documented
  trust-model comment in `rate-limit.ts` live.
- **Regression check on security headers**: CSP, `X-Frame-Options: DENY`,
  and the rest are still present and correct through nginx in the
  production build (client CSP `default-src 'self'; ...`; server CSP
  `default-src 'none'; frame-ancestors 'none'` on `/api/v1/*`).
- Stack torn down afterward (`docker compose down`) — nothing left running
  beyond this verification pass.

**Not covered by this pass** (Kali-specific tooling was unavailable):
`nikto`/`gobuster`/`wafw00f`-style broad scanning. Nothing in this change
touches routing, headers, or auth surface beyond the two rate-limit mounts,
so the broader scan from `localhost-pentest-owasp.md` was not re-run; it
should be repeated if the classifier block is lifted or a different sandbox
allows the Kali container.

## Suggested next steps (priority order)

1. Before adding a second `server` replica, replace the in-memory limiter
   with a shared-store implementation (e.g. Redis).
2. If the Kali-container path becomes available in this environment, re-run
   the broader `nikto`/`gobuster`/`wafw00f` scan from
   `localhost-pentest-owasp.md` for full parity with that established
   pattern (this round substituted targeted `curl`/`docker exec` checks,
   which cover the rate limiter specifically but not a full port/vuln
   sweep).
3. Real authenticated LINE-OAuth browser E2E testing — already flagged as
   an open gap in `remaining-work-2026-08-31.md`; unchanged by this round.

## Commit information

- Committed locally on `master`: `ff8ef94 feat(security): add per-client
  rate limiting to auth and API routes`.
- Files: `server/src/app.ts` (wired in the two rate limiters, gated off in
  tests), `server/src/middleware/rate-limit.ts` (new),
  `server/src/middleware/rate-limit.test.ts` (new).
- Not pushed (per AGENTS.md rule 8, push only on explicit request).
