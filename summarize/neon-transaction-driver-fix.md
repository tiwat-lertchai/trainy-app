# Fix: Neon HTTP driver does not support transactions

## Scope and outcome

Critical, pre-existing bug discovered while the user manually tested the
onboarding form: submitting a student request crashed with
`error: No transactions support in neon-http driver`. Fixed by switching
the production Neon driver, and separately fixed the "ชั้นปี" (year level)
field the user flagged as incorrectly validated.

## Root cause

`server/src/db/index.ts` used `drizzle-orm/neon-http` (via `neon()` from
`@neondatabase/serverless`) as the default database client. Neon's HTTP
driver is stateless per-request and **does not implement `db.transaction()`
at all** — every call throws immediately. This is documented Neon/Drizzle
behavior, not a Trainy-specific mistake, but it went unnoticed because:

- Local/CI tests use `DATABASE_DRIVER=postgres` (a real TCP connection via
  `drizzle-orm/postgres-js`), which does support transactions, so the test
  suite never exercised this path.
- No route that calls a transaction had been manually exercised against a
  real Neon-backed dev environment until the user submitted the onboarding
  form today.

Four repositories rely on `db.transaction()` for correctness (atomic
membership creation, capacity-safe application acceptance, atomic
admin/membership changes, and attendance schedule/adjustment review):
`onboarding.repository.ts`, `organization.repository.ts`,
`internship.repository.ts`, `attendance.repository.ts`. All of them were
silently broken in the deployed/default configuration.

## Fix

`server/src/db/index.ts`: replaced `neon()` + `drizzle-orm/neon-http` with
`Pool` (from `@neondatabase/serverless`) + `drizzle-orm/neon-serverless`,
Neon's WebSocket-based pooled driver, which does support real transactions
— this is Neon's own documented recommendation for any workload that needs
them. The `postgres` driver path (local Docker / integration tests) was
unchanged.

Verified directly against the real Neon database (not just types):
- `db.transaction()` now executes and returns real query results instead
  of throwing.
- Ran the exact previously-crashing code path
  (`OnboardingRepository.createApprovedStudent`) against the real DB with a
  synthetic user id — it failed on a (correct, expected) foreign key
  constraint instead of the transaction error, and confirmed the
  transaction rolled back cleanly with zero partial writes (no leftover
  `onboarding_request` or `organization_membership` rows).
- The dev server (`bun --watch`) auto-restarted after the file change;
  confirmed via its uptime counter.

I did not submit the onboarding form as the user's real account myself —
that's the user's action to take now that the server is fixed.

## Other fix in this batch: "ชั้นปี" (year level) validation

The generic `Field` component defaults `minLength={2}` for required text
inputs. The year-level field reused it with a single digit ("4"), so the
browser blocked submission with "Please lengthen this text to 2 characters
or more." Per user feedback ("เอาแค่หลักเดียวพอนะ" — one digit is enough),
replaced the free-text input with a `<select>` of ปี 1–6 in
`client/src/features/onboarding/onboarding-page.tsx`. Verified live in the
browser (attached to the user's authenticated session): selecting the
seeded university populated faculties, selecting a faculty populated its
majors, and "ปี 4" was selectable with no validation error.

## Files changed

- `server/src/db/index.ts` — driver switch (the fix).
- `client/src/features/onboarding/onboarding-page.tsx` — year-level
  dropdown.

## Verification commands and results

- `cd server && bun run type-check` / `bun run build` — pass
- `cd server && bun test src` — 106 pass, 0 fail (no behavior change to
  unit-testable logic; the bug was only reachable against a real database)
- Direct script against the real Neon database (see Fix section) — confirms
  transactions now work and roll back correctly
- `cd client && bun run build` / `bun test src` / `bun run lint` — pass
- `bun run type-check` / `build` / `test` / `lint` (root, turbo) — pass
- Live browser verification (attached to the user's own authenticated dev
  session): faculty/major cascading dropdowns and year-level select all
  work correctly against the real API and real seeded data.

## Known limitations

The actual "submit onboarding as a real approved student" path has not
been exercised end-to-end with the user's real account — the destructive
foreign-key test used a synthetic, cleaned-up user id instead, and I
deliberately left the real submission for the user to trigger themselves.
Please retry the onboarding form now; it should succeed.

## Commit information

Not yet committed — pending user confirmation.

## Suggested next steps

1. Retry submitting the student onboarding form in the browser to confirm
   the fix end-to-end with your real account.
2. Consider adding an integration test (using the `postgres` driver
   locally, matching the existing `*.repository.integration.ts` pattern)
   that would have caught this — or better, a smoke test that runs against
   the real Neon driver in CI, since the bug was invisible to every
   existing automated check.
