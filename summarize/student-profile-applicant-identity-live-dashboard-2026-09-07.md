# Student profile gate, applicant identity, and live dashboard

## Scope and outcome

- Added a student-owned personal and health profile with a database migration,
  authenticated API, and bilingual UI at `/app/profile`.
- Blocked both listed-position applications and self-arranged internship
  requests until the profile is complete. The backend enforces this rule even
  when a client bypasses the UI.
- Added applicant name and email to authorized onboarding review and internship
  request review cards.
- Made dashboard metrics refresh on mount, window focus, and every 15 seconds
  while the dashboard queries are active.

## Security decisions

- Health fields are stored in a separate `student_profile` table and are not
  embedded in application, onboarding-review, internship-request-review, or
  dashboard payloads.
- The profile API exposes only `GET /me` and `PUT /me`; there is no endpoint for
  reading another student's health data.
- Applicant identity is joined only after the existing server-side review
  authorization checks. Review lists remain tenant/assignment scoped.

## Files and systems changed

- `server/src/db/schema/student-profile.ts`, `server/drizzle/0015_pink_riptide.sql`
- `server/src/modules/student-profile/`
- Internship and internship-request services/routes and tests
- Onboarding and internship-request authorized review queries and review UI
- `client/src/features/student-profile/`, `client/src/routes/app.profile.tsx`
- Student navigation, internship application entry points, dashboard query
  options, bilingual messages, API reference, and route generation

## Dependency changes

None. `bun audit` checked 310 packages and found no known vulnerabilities.

## Verification

- `bun run type-check` — passed.
- `bun run test` — passed: server 172, client 54.
- `bun run lint` — passed with no warnings.
- `bun run build` — passed for shared, server, and client.
- `bun run test:integration` from `server/` — passed 41 PostgreSQL integration
  and adversarial cases, including profile persistence and applicant identity.
- `git diff --check` — passed.
- `docker-compose up -d --build` — production images built; migrations and seed
  ran; database, server, and client became healthy.
- Live `/api/v1/health` and `/api/v1/health/ready` — returned success; the new
  profile endpoint returned 401 without a session; the migration-created table
  existed in PostgreSQL.
- Disposable Kali container with `--network host` — unauthenticated profile
  reads/writes and review reads returned 401, attacker origin received no CORS
  grant, configured trusted origin was granted, and security headers remained
  present.
- All app/test containers, networks, and volumes created for verification were
  removed with `docker-compose --profile test down -v --remove-orphans`.

## Known limitations

- A real LINE-authenticated browser session was not available, so the final
  student and reviewer click-through was not exercised with a real account.
  Schema, service rules, typed client build, PostgreSQL behavior, and anonymous
  black-box boundaries were verified.

## Commit information

- Local commit message: `feat(students): require complete profile before applications`.
- No push performed.
