# Neon test database swap preparation — 2026-09-01

## Outcome

Prepared a guarded workflow for switching Trainy from the local Docker PostgreSQL database to an isolated Neon test branch. No real Neon credential was supplied or used, and no cloud database was mutated.

## Changes

- Added `compose.neon-test.yaml`. It removes the server's local database dependency, supplies the Neon driver, and runs the target guard before migration/seed and again afterward.
- Added `server/.env.neon-test.example` and explicitly ignored `server/.env.neon-test` so pooled connection credentials cannot be committed accidentally.
- Added `db:neon:check` and `db:neon:prepare` scripts.
- Added a Neon target validator that requires:
  - `DATABASE_DRIVER=neon`
  - `DATABASE_ENVIRONMENT=test`
  - a `neon.tech` hostname
  - an exact hostname match against `NEON_TEST_HOST`
  - `sslmode=require`
- The connection check prints only provider/host/database/user identity, never the password or complete URL.
- Added operator documentation at `server/docs/neon-test-database.md` and linked it from the server README.

## Dependencies

No dependency or lockfile changes. `bun audit` found no vulnerabilities in 310 packages.

## Verification

- Target-guard unit tests: 3 passed.
- Full server tests: 166 passed.
- Full client tests: 52 passed.
- Root type-check, ESLint, and production build: passed.
- Compose merge validation confirmed `server.depends_on` is empty and the server uses the guarded Neon startup command.
- Git ignore validation confirmed `server/.env.neon-test` is ignored.
- Local production-like Compose stack started successfully and was stopped afterward.
- Ephemeral Kali regression checked unauthenticated access, `.env` path traversal, credential-shaped response leakage, CSP, and `nosniff`; all checks passed. The Kali container was removed automatically.

## Usage

1. Create a dedicated Neon test branch or project and copy its pooled connection URL.
2. Copy `server/.env.neon-test.example` to `server/.env.neon-test`.
3. Fill `DATABASE_URL` and the exact hostname in `NEON_TEST_HOST`.
4. Run `bun --env-file=.env.neon-test run db:neon:check` from `server/`.
5. After checking the printed identity, run `bun --env-file=.env.neon-test run db:neon:prepare`.
6. Use the documented Compose override when Docker runtime should use Neon.

## Limitations and next step

The actual cloud connection, migrations, seed, and transaction smoke test remain intentionally unverified until the user provides/configures a dedicated Neon test branch URL. Do not point this workflow at production.

## Commit

Committed locally as `feat(db): add guarded Neon test workflow`. Not pushed.
