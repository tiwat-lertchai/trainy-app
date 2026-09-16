# Internship request draft and idempotent submission slice

## Scope and outcome

- Implemented the first current-release product-design slice for self-arranged
  internship requests.
- Requests now begin as editable drafts. Approval rows are created only during
  formal submission.
- Formal submission and resubmission use client-generated idempotency keys and
  monotonically increasing submission versions.
- Added the proposed-company contact position and postal address fields.
- Student dashboard next actions now account for draft, returned, and submitted
  self-arranged requests.

## Important decisions

- Each student may hold at most five drafts and two active requests. Active
  means `submitted` or `revision_requested`.
- An idempotency key is scoped to the submitting user and one request. Replaying
  it returns the existing result without duplicating approvals or advancing the
  submission version; reusing it for another request returns a conflict.
- Server-side membership, advisor, academic-major, program-chair, company, and
  request ownership checks remain authoritative at submission time.
- The PostgreSQL enum migration replaces the enum type transactionally instead
  of using `ALTER TYPE ... ADD VALUE`, because the latter cannot be used as a
  new default in the same Drizzle migration transaction on an existing database.

## Files and systems changed

- Internship-request schema, migration, repository, service, validation, routes,
  unit tests, and PostgreSQL integration tests under `server/`.
- Student request UI, bilingual messages, presentation rules, and dashboard
  next-action logic under `client/`.
- `server/docs/api-reference.md` documents the draft, update, submit, replay,
  limit, and proposed-company contracts.

## Dependencies

- No dependency or lockfile changes.
- `bun audit` checked 312 packages and found no known vulnerabilities.

## Verification

- `bun run verify:fast`: passed; formatting, TypeScript, lint, 177 server tests,
  69 client tests, and production builds passed.
- `bun run db:check`: passed.
- Fresh PostgreSQL migration and `bun run test:integration`: passed, 42 tests.
- The migration also passed against the existing persistent local database
  volume after an initial unsafe enum migration was identified and corrected.
- Production Compose images built and the database, server, and client became
  healthy.
- Disposable Kali black-box checks confirmed the new draft update, submit, and
  resubmit endpoints reject anonymous access with `401`; an untrusted origin
  received no CORS allow-origin header; security headers remained present. The
  Kali container was removed.
- `git diff --check`: passed.

## Known limitations

- The workflow was not exercised through a browser with real authenticated role
  accounts.
- The two active and five draft limits are currently product constants; moving
  them to cycle configuration belongs with the internship-cycle slice.
- Docker builds reinstall dependencies after any source change because the
  Dockerfiles copy the full repository before `bun install`; optimizing build
  cache layers remains an operational follow-up.

## Commit information

- Local commit: `feat(internship-requests): add draft submission workflow`.
- No push requested or performed.

## Suggested next step

Implement Slice 2: internship cycles, placement milestones, and the filtered
user-visible placement timeline.
