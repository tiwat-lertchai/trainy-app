# Proxy IP header trust hardening - 2026-10-07

## Scope and outcome

An authorized local Kali black-box pass found that a client connecting directly to the Bun
server could rotate `X-Real-IP` values to receive fresh in-memory rate-limit budgets. The
production Compose topology was already protected because it does not publish the server port
and nginx overwrites this header, but the direct-server default was unsafe.

The server now ignores proxy IP headers by default. `TRUST_PROXY_IP_HEADERS=true` is set only
inside the two production Compose server services, where nginx is the sole public entry point.

## Files changed

- `server/src/config/env.ts`: added the explicit proxy-header trust setting.
- `server/src/middleware/rate-limit.ts`: uses `X-Real-IP` only when trust is enabled.
- `server/src/middleware/rate-limit.test.ts`: added a spoofed-header regression test.
- `.env.example`, `compose.yaml`, `compose.neon.yaml`: documented and wired the trust boundary.
- `bun.lock`: updated `source-map-js` from 1.2.1 to patched 1.2.2 after a High advisory was found.

## Verification

- `bun audit`: passed, 312 packages checked, no known vulnerabilities.
- TypeScript checks, client lint, server/client tests, and production builds: passed.
- Tests: 198 server and 78 client tests passed.
- PostgreSQL 17 migration and integration/security suite: 46 tests passed.
- Kali live retest against the direct native server: rotating `X-Real-IP` returned 200 for
  requests 1-20 and 429 for request 21, confirming that spoofed headers no longer reset the
  budget. CORS, headers, unauthenticated boundaries, and oversized-body rejection also passed.

## Limitations

- The limiter remains process-local and needs shared storage before horizontal scaling.
- A fresh Docker image build stalled at `bun install` with zero CPU activity, matching the
  existing environment limitation. Native production builds passed; the current image was not
  freshly produced.
- The repository-wide formatting gate remains blocked by the pre-existing untracked
  `docs/database-architecture.md`; changed tracked files passed their applicable formatting.

## Commit information

Local commit message: `fix(security): make proxy IP trust explicit`. No push was requested or
performed.
