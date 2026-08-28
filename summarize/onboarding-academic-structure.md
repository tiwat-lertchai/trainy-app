# Onboarding form: clearer organization field + faculty/major dropdowns

## Scope and outcome

Follow-up to user feedback on the first-time onboarding form (screenshot
annotation): the "organization" field was confusing (unclear it meant
"university"), and faculty/major were free-text inputs with no predefined
options. Added a backend academic-structure feature (faculties and majors
scoped to a university organization) and wired the onboarding form to use
it, plus a seed script for a specific requested university.

## Decisions

- The organization field label is now `องค์กร/มหาวิทยาลัย` (university flow)
  or `องค์กร/บริษัท` (company flow) instead of the bare `องค์กร`, per the
  user's explicit request to add a "/" so it reads unambiguously.
- Faculties and majors are new master-data tables scoped to a university
  organization (`academic_faculty`, `academic_major`), not free text.
  Reading them requires only authentication (no membership), matching how
  `GET /api/v1/onboarding/organizations` already works pre-onboarding.
  Creating them requires `university_admin` membership in that university.
- The onboarding form still submits `faculty`/`major` as display-name
  strings to the existing onboarding schema (unchanged) — the dropdowns
  resolve the selected ID to its name client-side before submit, so the
  onboarding backend contract did not need to change.
- Major selection is cascading (depends on the chosen faculty) and only
  shown for the student role; faculty selection is shown for student and
  advisor (the two roles with a `faculty` field).

## Files and systems changed

Backend (`server/`):
- `src/db/schema/academic.ts`, migration `drizzle/0009_classy_paladin.sql`
  — `academic_faculty` and `academic_major` tables, each with a unique
  name-per-parent constraint.
- `src/modules/academic/{academic.schema,repository,service,route}.ts` —
  new module, mounted at `/api/v1/academic`. Read endpoints require only
  authentication; write endpoints require `university_admin` membership in
  the relevant university.
- `src/modules/academic/academic.service.test.ts` — 8 new unit tests.
- `src/app.test.ts`, `src/api-documentation.test.ts`,
  `docs/api-reference.md` — unauthenticated-access check and documentation
  for the new routes, consistent with other modules.
- `src/scripts/seed.ts` (+ `db:seed` script in `package.json`) — idempotent
  seed inserting "มหาวิทยาลัยราชภัฏจันทรเกษม" (Chandrakasem Rajabhat
  University) with 5 faculties and 3 sample majors under Science and
  Management Science. **The faculty/major names are my best-effort
  approximation of that university's real structure, not verified against
  an official source — review and adjust before relying on them.**

Frontend (`client/`):
- `src/features/onboarding/onboarding-rules.ts` (+ test) —
  `organizationFieldLabel` and `facultiesEnabledForRole` helpers.
- `src/features/onboarding/onboarding-page.tsx` — organization field label
  now includes the requested "/", and faculty/major are cascading
  `<select>` dropdowns fetched from the new academic endpoints instead of
  free-text inputs.

## Dependency changes

None. No lockfile changes.

## Verification commands and results

- `cd server && bun run type-check` / `bun run build` — pass
- `cd server && bun test src` — 106 pass, 0 fail (8 new)
- `drizzle-kit generate` / `drizzle-kit check` (offline schema diff) — clean,
  no drift
- `cd client && bun test src` — 30 pass, 0 fail (2 new)
- `cd client && bun run build` — pass
- `bun run lint` (root, turbo → eslint) — pass
- `bun run build` / `bun run test` (root, turbo, all packages) — pass

## Known limitations

Same environment limitation as the attendance work: no local Postgres/Neon
database and no LINE OAuth credentials are configured here, so the
authenticated onboarding flow (actually selecting a university, seeing
faculties/majors populate, submitting) was **not** exercised end-to-end in
a logged-in browser. I attached to the user's own already-running Vite dev
server at `localhost:5173` to sanity-check the bundle loads, but did not
navigate through their session. Coverage is otherwise from the 8 new
backend unit tests and the 2 new frontend rule tests.

The seed script (`bun run db:seed` from `server/`) has not been run against
a real database in this session — no `DATABASE_URL` is configured here.

## Commit information

Not yet committed — pending user confirmation.

## Suggested next steps

1. Run `bun run db:seed` (in `server/`) against a real database, then
   manually verify the onboarding form: pick the seeded university, confirm
   faculties/majors populate and cascade correctly, and submit as a student.
2. Have someone confirm Chandrakasem Rajabhat University's actual current
   faculty/major names and adjust `src/scripts/seed.ts` accordingly.
3. There is currently no admin UI for a `university_admin` to add their own
   faculties/majors — only the API (`POST /api/v1/academic/...`) exists.
   Worth a small admin page if universities other than the seeded one need
   to self-serve this.
