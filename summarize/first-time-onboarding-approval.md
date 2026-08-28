# First-time onboarding and approval workflow

## Scope

- Added first-login role selection for student, advisor, coordinator, university admin, company admin, and supervisor.
- Added role-specific identity and organization forms.
- Students are activated immediately in an active university.
- Advisor and coordinator requests require the selected university admin.
- Supervisor requests require the selected company admin.
- First company admins and university admins require system-level CWIE staff approval.
- Company approval requires an explicit document-verification confirmation and atomically creates the company and its first admin membership.
- Reviewers can approve, reject, or request revision. Revision-requested applicants can correct and resubmit.

## Security boundaries

- Review eligibility is enforced by the backend, not by visible frontend navigation.
- Organization type is validated against the requested role.
- Platform staff is stored separately from tenant membership and cannot be self-assigned through a public endpoint.
- Supervisor access remains unavailable until company approval and membership activation.
- Company creation, membership activation, and request approval use one database transaction.

## Main files

- `server/src/modules/onboarding/`: schemas, repository, service, routes, unit tests, and PostgreSQL integration tests.
- `server/src/db/schema/onboarding.ts`: onboarding requests and platform staff tables.
- `server/drizzle/0007_aspiring_shocker.sql`: database migration.
- `client/src/features/onboarding/`: applicant and reviewer interfaces plus presentation-rule tests.
- `server/docs/api-reference.md`: endpoint contract and approval matrix.

## Verification performed

- Dependency audit: 308 packages checked, no known vulnerabilities.
- Unit tests: server 75 passed; client 15 passed.
- PostgreSQL integration tests: 14 passed across organization, onboarding, internship, and placement repositories.
- TypeScript checks: passed.
- Lint: passed.
- Production build: passed.
- Git whitespace validation: passed.

## Deployment requirements

1. Apply migration `0007_aspiring_shocker.sql` to the intended environment.
2. Have the initial CWIE reviewer sign in once.
3. An authorized database operator must insert that user into `platform_staff`; no public bootstrap endpoint exists by design.
4. Use `http://localhost:5173`, not `http://127.0.0.1:5173`, for the configured local LINE Login and CORS origin.

## Known follow-up

- The onboarding and review screens currently use Thai UI copy. Move their copy into the existing Thai/English translation dictionaries before the bilingual production release.
