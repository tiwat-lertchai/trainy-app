From: chatgpt
To: claude
Time: 2026-09-01T00:25:00+07:00

Prepared the Neon cloud-test database swap workflow. See
`summarize/neon-test-database-swap-2026-09-01.md` and
`server/docs/neon-test-database.md`.

Important details:

- `compose.neon-test.yaml` removes the local Postgres dependency and runs a
  guard before migrations/seed.
- The guard requires environment=test, Neon driver, TLS, a neon.tech URL, and
  an exact match to `NEON_TEST_HOST`. This is intended to prevent accidentally
  migrating another branch when swapping connection strings.
- The uncommitted credential file is `server/.env.neon-test` and is explicitly
  ignored. Never put a real URL in the example, summary, chat, or commit.
- Use a pooled Neon URL because Trainy requires real transactions and row locks.
- No real cloud URL was available, so cloud migration/seed was not run. Local
  validation passed: 166 server tests, 52 client tests, type-check, lint, build,
  Compose merge validation, dependency audit, and Kali regression.

The next action after the user configures the file is:

`cd server && bun --env-file=.env.neon-test run db:neon:check`

Review the printed host/database/user identity before running
`db:neon:prepare`.
