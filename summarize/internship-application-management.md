# Internship and application management frontend

## Scope

- Added a role-aware application page for students, university staff, company admins, and supervisors.
- Students can track and withdraw non-terminal applications.
- University admins, coordinators, and advisors can monitor applications from their university.
- Company supervisors can start review; only company admins can accept or reject.
- Company admins can create internship drafts, publish them, and close them. Supervisors have read-only access.
- Application list responses now include the related internship and university. Authorized staff responses include the student's basic name and email.

## Security and workflow rules

- Backend tenant and role checks remain authoritative for every read and mutation.
- Applicant identity is returned only after company or university access checks.
- Published internship content remains immutable.
- Application acceptance continues to use the serialized capacity check.
- Terminal applications cannot be reopened and supervisors cannot make terminal decisions.

## Main files

- `client/src/features/applications/`: role-aware application UI and rule tests.
- `client/src/features/internships/company-internship-page.tsx`: company internship lifecycle UI.
- `server/src/modules/internships/internship.repository.ts`: authorized enriched application list data.
- `client/src/routes/app.applications.tsx`: application route.

## Verification

- Client tests: 18 passed.
- Server tests: 75 passed during implementation.
- Internship PostgreSQL integration tests: 4 passed from a clean disposable database.
- Client and server TypeScript checks: passed.
- Client lint and production build: passed.
- Dependency audit at task start: 308 packages, no known vulnerabilities.

## Follow-up

- Move authenticated application and internship copy into the shared Thai/English dictionaries.
- Add confirmation dialogs before terminal accept, reject, close, and withdraw actions.
- Build placement creation and advisor/supervisor assignment screens next.
