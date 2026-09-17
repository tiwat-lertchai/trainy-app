# Student self-reported GPA profile fields

## Scope and outcome

- Added required cumulative and latest-term GPA inputs to the student profile.
- Students enter and update both values themselves on the same form as their
  personal, emergency-contact, and health information.
- Values are constrained to the 0.00–4.00 scale in both the browser and API.

## Product and data decisions

- Student-entered GPA is stored on `student_profile` and explicitly described
  as self-reported.
- The existing `student_academic_record` remains separate and university
  maintained. The change does not present self-reported values as verified
  academic records.
- Existing profile rows remain valid database rows after migration, but the
  application treats them as incomplete until both GPA values are supplied.

## Security boundary

- The existing authenticated `/student-profile/me` endpoint remains the only
  read/write interface, and derives ownership from the session rather than a
  browser-supplied student identifier.
- Server validation rejects non-numeric values and values outside 0.00–4.00.

## Files and systems changed

- Student-profile schema, validation, repository, route, tests, and migration
  `server/drizzle/0017_new_nightmare.sql`.
- Student profile form and bilingual copy under `client/src`.
- API documentation and requirement `STU-PRO-08`.

## Dependencies

- No dependency or lockfile change was required.

## Verification

- Focused validation tests cover valid, over-range, under-range, and non-numeric GPA.
- `bun run --cwd server db:check`: passed.
- `bun run type-check`: passed.
- `bun run lint`: passed.
- `bun run test`: 75 client tests and 183 server tests passed.
- `bun run build`: passed, including the production client build.
- `bun audit`: no known vulnerabilities across 312 packages.
- `git diff --check`: passed.

## Known limitations

- Database-backed integration and the repository-required disposable-Kali pass
  require a running Docker daemon.

## Commit information

- No commit or push was performed during implementation.
