# Security verification — 2026-09-15

## Scope and outcome

Re-verified Trainy's authentication, authorization, tenant isolation, browser
security controls, upload/request boundaries, dependency state, and local production
network exposure. No exploitable vulnerability was found in this pass.

The pre-existing changes in `.env.example`, `compose.yaml`, and `compose.neon.yaml`,
and the untracked web revision draft were preserved and were not modified.

## Verification results

- `bun audit` found no known vulnerabilities across 312 packages.
- `bun run verify:fast` passed formatting, TypeScript, lint, 175 server tests,
  68 client tests, and all production builds.
- Migrations applied successfully to the disposable PostgreSQL 17 test database.
- `bun run --cwd server test:integration` passed all 41 database-backed tests,
  including 15 authenticated cross-tenant/role-escalation checks and 10 terminal or
  duplicate-state abuse checks.
- A disposable Kali container scanned the isolated local production stack. Only
  nginx on port 8081 was exposed; the API and PostgreSQL ports were closed externally.
- Client and API responses included the expected CSP, Permissions-Policy,
  X-Frame-Options, and X-Content-Type-Options controls.
- The trusted origin received the configured CORS allow-origin response. An attacker
  origin received no allow-origin response and therefore could not read credentialed
  responses in a browser.
- TRACE returned 405. Requests resembling `.env`, `.git`, backend source, and path
  traversal returned the same SPA shell rather than host or repository files.
- The authentication perimeter allowed 20 requests and returned 429 for the next 5.
  Supplying a forged `X-Real-IP` did not bypass the exhausted budget.
- An external OAuth callback was rejected with 403 `INVALID_CALLBACK_URL`; the trusted
  callback succeeded and used PKCE S256. The temporary state cookie was HttpOnly,
  Secure, SameSite=Lax, path-scoped, and short-lived.
- An oversized API request was rejected with 413.

## Environment and limitations

- The fresh Docker image build stalled inside `bun install` without CPU activity or
  further output and was stopped. Runtime black-box checks therefore used the local
  production images built earlier the same day. The current source was independently
  covered by the successful production build and test gates, but the image rebuild
  itself was not freshly verified in this pass.
- The first OAuth requests immediately after a manual server restart reached nginx
  before its upstream was ready and returned 502. Retesting after the server health
  check became healthy produced the expected 403 and 200 results; this was a startup
  readiness race, not an authorization bypass.
- Real SMTP delivery, external LINE provider completion, and production infrastructure
  were not exercised because they require real credentials and external systems.
- The in-memory rate limiter remains suitable only for the current single-server
  deployment and must move to shared storage before horizontal scaling.

## Cleanup

The Kali container used `--rm`. The isolated application containers, disposable test
database, Docker network, temporary volumes, and temporary image tags were removed
after verification.

## Dependency and application changes

No dependency, application code, schema, or deployment configuration was changed.
This file is the verification record for the test-only task.
