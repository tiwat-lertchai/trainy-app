# Chandrakasem academic catalog seed

## Scope and outcome

Replaced the placeholder Chandrakasem Rajabhat University academic seed with the
faculty and major catalog supplied on 2026-09-16. The configured Neon database
was seeded successfully and now contains 5 faculties and 47 faculty-based
majors for the university.

The source catalog also contains one Public Administration program at the
Chandrakasem Rajabhat University–Chainat campus. It was not inserted because
the current data model only supports majors beneath faculties and has no campus
academic-unit type.

## Files and systems changed

- `server/src/scripts/seed-academic-data.ts` — stores the reviewed university,
  faculty, and major seed catalog.
- `server/src/scripts/seed-academic-data.test.ts` — verifies the expected 5/47
  totals and uniqueness constraints required by the database schema.
- `server/src/scripts/seed.ts` — consumes the catalog and migrates the earlier
  placeholder seed by renaming `คณะครุศาสตร์` to `คณะศึกษาศาสตร์` and removing
  the three superseded placeholder major names.
- Configured Neon database — seed applied twice successfully to confirm the
  operation is repeatable; verified final totals of 5 faculties and 47 majors.

The two Art and Design tracks are represented as distinct display names with
their track in parentheses. The Bachelor of Education English program is named
`ภาษาอังกฤษ (ค.บ.)` to distinguish it from the Arts English program under the
same faculty, matching the existing unique-name-per-faculty constraint.

## Dependency changes

None. `bun audit` reported no known vulnerabilities across 312 packages.

## Verification

- `bun test server/src/scripts/seed-academic-data.test.ts` — 2 pass, 0 fail.
- `bun run fmt:check` — pass.
- `bun run type-check` — pass.
- `bun run lint` — pass.
- `bun run test` — client 73 pass; server 181 pass; 0 fail.
- `bun run build` — pass for shared, server, and client.
- `bun server/src/scripts/seed.ts` — pass twice against the configured Neon
  database.
- Read-only post-seed query — 5 faculties and 47 majors.

## Known limitations

- Campus-level programs need a future schema extension before the Chainat
  campus entry can be modeled without misclassifying the campus as a faculty.
- The `server` package's `db:seed` script does not discover the root `.env` when
  launched with `--cwd server`; this task used the same seed entrypoint from the
  repository root. This pre-existing environment-loading behavior was not
  changed.

## Commit information

Committed locally as a dedicated conventional commit after verification. Not
pushed.
