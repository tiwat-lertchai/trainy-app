# Role-specific dashboards and university-scoped company requests

## Scope and outcome

- Reworked the main application dashboard so students, advisors, university
  operations staff, company administrators, and supervisors no longer receive
  the same generic presentation.
- Added company onboarding request routing through a selected sponsoring
  university.
- Added tenant-scoped review access for active university administrators and
  coordinators, while retaining platform-staff access.
- Added access-review navigation only for roles that can make onboarding
  decisions.

## Product behavior

- Students retain the action-oriented, package-tracking style internship
  journey and personal next actions.
- Advisors receive a supervision workspace focused on assigned students,
  pending decisions, evaluations, and progress.
- University administrators and coordinators receive an operations workspace
  with a prominent company-access queue, application review, placements, and
  reports.
- Company administrators receive a recruitment-focused workspace; supervisors
  receive a daily attendance and progress-focused workspace.
- A first company administrator must select a sponsoring university during
  onboarding. Only platform staff or an active university administrator or
  coordinator in that exact university can see and decide the request.
- Legacy company requests without a sponsoring university remain visible only
  to platform staff, preventing accidental cross-tenant disclosure.

## Security decisions

- Authorization remains server-side and deny-by-default.
- Company onboarding review checks the reviewer's active membership against the
  request's `targetOrganizationId`; it does not trust navigation visibility.
- Tests cover the allowed same-university coordinator path and denied
  cross-university and non-admin paths.
- No database migration was required because `targetOrganizationId` already
  exists. For a pending company request it represents the sponsoring
  university; after approval the existing transaction replaces it with the
  newly created company organization.

## Files and systems changed

- Dashboard presentation, navigation rules, dashboard data tests, and bilingual
  messages under `client/src/features/dashboard`,
  `client/src/features/organizations`, and `client/src/i18n/messages.ts`.
- Company onboarding organization selection and presentation rules under
  `client/src/features/onboarding`.
- Onboarding validation, authorization, tests, and integration fixture under
  `server/src/modules/onboarding`.
- `server/docs/api-reference.md` documents the sponsoring-university contract
  and reviewer matrix.

## Dependencies

- No dependency or lockfile change was made for this task.
- `bun audit` checked 312 packages and found no known vulnerabilities.

## Verification

- Focused role-navigation, dashboard, onboarding, and authorization tests: 28
  passed, 0 failed.
- Full `bun run test`: 75 client tests and 182 server tests passed.
- `bun run type-check`: passed for client, server, and shared packages.
- `bun run lint`: passed.
- `bun run build`: passed, including the production Vite build.
- `git diff --check`: passed.
- PostgreSQL integration tests and the required disposable-Kali black-box pass
  could not run because the Docker CLI is installed but the Docker daemon is
  unavailable at `/var/run/docker.sock`.

## Known limitations

- The role-specific dashboards were not exercised in a browser with real
  authenticated accounts for every role.
- Pending legacy company requests without `targetOrganizationId` require
  platform-staff handling or a deliberate data backfill before a university
  coordinator can review them.
- The security-sensitive increment is not considered fully shippable until the
  database integration suite and repository-required Kali pass run in a
  Docker-capable environment.

## Commit information

- No commit was created. The working tree already contains overlapping
  user-owned changes, and required Docker-backed verification is incomplete.
- No push or deployment was performed.

## Suggested next steps

1. Start Docker Desktop or another Docker daemon, then run the disposable
   PostgreSQL integration suite and Kali black-box verification.
2. Exercise each dashboard with seeded student, advisor, coordinator, company
   administrator, and supervisor accounts.
3. Decide whether to backfill a sponsoring university for legacy pending
   company requests.
