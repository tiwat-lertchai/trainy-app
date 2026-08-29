# Repeatable integration test suite

## Scope and outcome

- Fixed the placement repository integration fixture so it removes the records
  it creates before closing its database connection.
- The full integration chain can now run repeatedly against the same PostgreSQL
  test database instead of failing on the next run with organization foreign-key
  violations caused by a leftover placement.

## Files changed

- `server/src/modules/placements/placement.repository.integration.ts`

## Dependencies

- No dependency or lockfile changes.

## Verification

- Started the Compose `postgres-test` PostgreSQL 17 service using tmpfs.
- Applied every repository migration successfully.
- `bun run --cwd server test:integration` — pass, 39 tests.
- Ran the same command immediately again without resetting PostgreSQL — pass,
  39 tests.
- Stopped the test container after verification.

## Known limitations

- This verifies repeatability in sequence. The integration files intentionally
  remain sequential because they share one test database.

## Commit information

- Local commit message: `test(server): make integration suite repeatable`.
- No push requested or performed.
