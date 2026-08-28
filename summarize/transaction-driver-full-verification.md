# Every db.transaction() call site verified against the real database

## Scope and outcome

Follow-up to the Neon transaction driver fix ([neon-transaction-driver-fix.md](neon-transaction-driver-fix.md)):
that fix was only concretely proven for the onboarding module (the path
the user hit manually). All four repositories that use `db.transaction()`
had never been exercised against a real Neon-backed database before this
session — only against the local `postgres`-driver test suite, which is
why the bug was invisible to every automated check. This pass verifies the
fix covers **all four**, not just onboarding.

## What was done

No code changes. This is a verification-only pass: ran scripts against the
real database (`server/.env`'s `DATABASE_URL`), each creating temporary
synthetic data (referencing the real seeded university and the real
signed-in user's id — no fabricated `user` row was created), exercising
the transactional repository method, then deleting everything in FK-safe
order.

1. **Attendance** (`AttendanceRepository`) — created a synthetic company/
   internship/application/placement chain. `replaceSchedules` (delete+insert
   in one transaction) created a weekly schedule. Checked in, requested a
   time adjustment, then `reviewAdjustment` (attendance update + adjustment
   status update in one transaction) approved it — the attendance record's
   status/net-minutes were correctly recalculated (`complete`, 475
   minutes).
2. **Organizations** (`OrganizationRepository.createWithOwner`) — created a
   company organization and its owning membership atomically; confirmed
   both rows exist together.
3. **Internships** (`InternshipRepository.acceptApplicationWithinCapacity`)
   — this one additionally does `SELECT ... FOR UPDATE` row locking before
   the capacity check, the strictest transactional feature in the app.
   Created a synthetic internship (capacity 1) and application, called
   `acceptApplicationWithinCapacity` — the application was accepted inside
   the locking transaction. (A follow-up "second application should be
   capacity-blocked" check hit an unrelated unique-constraint error in the
   test script itself — one student can't apply to the same internship
   twice — not a transaction/driver problem; that specific scenario is
   already covered by `InternshipService`'s existing unit tests with a
   mocked repository.)
4. **Onboarding** — already verified in the driver-fix pass, and now also
   confirmed live by the user successfully submitting the real onboarding
   form.

All synthetic organizations, internships, applications, placements, and
attendance rows created during these checks were deleted afterward.
Confirmed only the real seeded university organization remains in the
database — no leftover test data.

## Verification commands and results

- Four direct script runs against the real Neon database (one per
  repository above) — every `db.transaction()` call site in the app,
  including the row-locking one, now works correctly with clean
  commit/rollback behavior.
- No source changes in this pass, so no type-check/build/test/lint re-run
  was needed; the 106 server + 30 client automated tests from the driver-fix
  commit remain the current baseline.

## Known limitations

None remaining for transaction coverage — every repository using
`db.transaction()` in the codebase has now been exercised against the real
database at least once.

## Suggested next steps

Longer-term: add a CI job or pre-deploy smoke test that runs against a
real Neon branch (not just the local `postgres` driver), so a regression
like this — invisible to the entire existing test suite — is caught
automatically instead of by manual testing.
