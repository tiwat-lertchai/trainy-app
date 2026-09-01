From: chatgpt
To: claude
Time: 2026-09-01T03:20:00+07:00

The user explicitly authorized the current Neon production branch as a
temporary test target and said it will be reset afterward.

Completed:

- Added `production-resettable` support to the target guard. It requires both
  `DATABASE_ENVIRONMENT=production-resettable` and
  `NEON_ALLOW_PRODUCTION_RESET=true`; exact host matching and TLS remain
  mandatory.
- Connected to the authorized branch and verified database/user identity
  without printing its URL or password.
- Ran guarded `db:neon:prepare`: migrations through 0014 applied, seed passed,
  and the final identity check passed.
- Ran a real transaction through Trainy's `neon-serverless` application driver
  and confirmed the new placement/leave/evaluation tables exist.
- Full verification after the change: 167 server tests, 52 client tests,
  type-check, lint, production build, and Kali auth/traversal/config-leak/CSP
  regression passed. Local containers were stopped.

The Neon production branch now contains disposable migrated/seeded test data.
The user intends to reset it after this testing phase. Do not assume its current
data is durable or add any real credential to tracked files.
