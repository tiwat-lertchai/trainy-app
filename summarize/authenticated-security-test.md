# Authenticated security testing, round 2: cross-tenant IDOR, role escalation, terminal-state abuse

## Scope and outcome

Follow-up to the black-box localhost pentest
([localhost-pentest-owasp.md](localhost-pentest-owasp.md)), which was
explicitly unauthenticated/external only. This round covers what that one
couldn't: **authenticated, insider abuse** — can one tenant's user reach
another tenant's data, can a user act outside their role, and can
terminal/duplicate business states be abused. Assigned by the other agent
(chatgpt/Codex) in `chats/009-chatgpt.md`; scope and file ownership were
acknowledged in `chats/010-claude.md` before any edits.

**No real user data was used or touched.** Every fixture is synthetic, and
everything runs against the repo's existing local, ephemeral,
tmpfs-backed integration-test Postgres (`compose.yaml`'s `postgres-test`,
port 5433) — the same one the pre-existing
`*.repository.integration.ts` files already use — never the real dev
database. A second real authenticated account was never needed: every
service method already takes `actorUserId` as an explicit parameter
decoupled from the HTTP/session layer, so exercising the exact
authorization logic a real session would hit doesn't require Better
Auth/LINE OAuth in the loop.

## New files

- `server/src/security.authenticated-idor.integration.ts` — 15 tests.
- `server/src/security.state-abuse.integration.ts` — 10 tests.
- `server/package.json`'s `test:integration` script — both new files
  appended to the existing chain.

Named `*.integration.ts` (not `*.test.ts`) to match the repo's existing
convention: `bun test src` (the default suite) must not pick these up,
since they need the dedicated Postgres container running and would
otherwise collide with each other over the shared database connection
(see Findings below).

## Findings

### Confirmed correct (no vulnerability) — 25/25 checks
Every cross-tenant IDOR, role-escalation, and terminal/duplicate-state
abuse attempt tested was correctly rejected:

- **Cross-tenant IDOR** (an outsider student from an unrelated university,
  zero relationship to the target placement): blocked from reading
  attendance, progress reports, documents (list and download), and
  evaluations for a placement they're not part of; blocked from listing
  another university's placements; blocked from reading another
  university's admin report/summary. Attendance and progress correctly
  return a **privacy-preserving 404** (`ATTENDANCE_NOT_FOUND`,
  `PROGRESS_REPORT_NOT_FOUND`) rather than a 403 that would confirm the
  resource exists — documents/evaluations/reports correctly use 403
  instead, since listing membership requirements doesn't leak existence
  the same way.
- **Tenant boundary, not just role check**: a `university_admin` of
  University B (a real admin, just the wrong tenant) is still rejected
  reading University A's report — confirms authorization is scoped by
  organization membership, not just "has an admin role somewhere."
- **Role escalation**: a student cannot review their own document, cannot
  score their own evaluation, an advisor cannot set a company's work
  schedule (company_admin-only), a coordinator cannot create academic
  faculties (university_admin-only — coordinators are often mistakenly
  treated as equivalent to admins, so this specifically checks they
  aren't), and a student is rejected from the organization-wide placement
  listing endpoint even for their own university (that endpoint is staff
  Fonly by design; students use a separate "my placements" endpoint).
- **Terminal-state abuse**: a completed placement cannot be reactivated or
  cancelled.
- **Duplicate-action abuse**: a second same-day attendance check-in is
  rejected by the real Postgres unique constraint (not just application
  logic); a second pending time-adjustment request is rejected; a document
  cannot be reviewed twice (no flipping approved→rejected after the
  fact); a submitted evaluation is immutable to further submit/save calls;
  a submitted progress report's content cannot be edited; a draft
  (not-yet-submitted) report cannot be reviewed; accepting an internship
  application beyond capacity is correctly serialized by the
  `SELECT ... FOR UPDATE` row-locking transaction even when two accept
  calls race concurrently (`Promise.all`) — exactly one succeeds; a second
  onboarding request is rejected while one is already pending.

**No vulnerabilities found in this pass.**

### Pre-existing bug found (unrelated to this round's scope, not fixed)
The repo's four original `*.repository.integration.ts` files are **not
idempotent as a chain** — running `test:integration` twice in a row
against the same database fails, because `placement.repository.integration.ts`
leaves a `placement` row behind that the next run's
`organization.repository.integration.ts` cleanup (`delete from organization`,
unscoped) then can't satisfy (FK violation). Reproduced with and without
this round's new files present — confirmed pre-existing, not something
introduced here. Likely never caught before because CI presumably starts
from a fresh database each time rather than re-running the chain twice.
Not fixed here (out of this round's assigned scope, and touches files
this round wasn't asked to change) — flagged for whoever owns that area
next. **This round's own two new files are independently idempotent**,
verified by running them repeatedly (including on top of the other
files' leftover state) with no failures.

## Verification commands and results

- `bun test ./src/security.authenticated-idor.integration.ts` — 15 pass,
  run repeatedly (including reversed order relative to the other new
  file) with no failures.
- `bun test ./src/security.state-abuse.integration.ts` — 10 pass, same
  repeatability check.
- `bun run test:integration` (full chain, from a freshly-restarted
  `postgres-test` container) — 39 pass across all 6 files, single clean
  run.
- `bun run type-check` / `bun run build` / `bun run test` (default suite,
  root, turbo, all packages) — pass; confirms these new files are
  correctly excluded from the default `bun test src` run.
- `bun run lint` (root, turbo → eslint) — pass.
- No changes to `server/src/app.ts`, any feature implementation, dashboard
  navigation, or route-tree files, per the assignment's restrictions —
  confirmed via `git status` before committing.

## Known limitations

- This covers the six areas named in the assignment (placements,
  attendance, progress, documents, evaluations, reports) plus internship
  capacity and onboarding duplication as concrete examples of the same
  "terminal/duplicate state" theme. It does not attempt every possible
  authorization edge case in every module (e.g. suspended-membership
  timing races, or every possible role×action combination) — it's a
  representative pass, not exhaustive.
- Still doesn't cover the actual HTTP/session layer (cookie handling,
  CSRF, Better Auth session fixation) — that would need a real or
  simulated authenticated browser session, which is explicitly out of
  scope for this round per the assignment (stop and report if a second
  authenticated account is required — it wasn't, but a full HTTP-level
  session-based pass is a different exercise).

## Commit information

Not yet committed — pending user confirmation, per this session's
established convention (verify fully, then commit locally, never push
automatically).

## Suggested next steps

1. Whoever next touches the four original integration test files should
   fix `placement.repository.integration.ts`'s missing cleanup so the
   chain is idempotent (see Findings above).
2. If a real second authenticated account (e.g. a second LINE-login
   `university_admin`/`student` in a different organization) becomes
   available, a follow-up pass could drive the same scenarios through the
   actual HTTP routes with real session cookies for full end-to-end
   confidence, rather than at the service layer.
