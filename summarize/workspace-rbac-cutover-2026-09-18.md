# Workspace RBAC clean cutover — 2026-09-18

## Outcome

Trainy now resolves workspace access from `access_role` and
`membership_role_assignment`. The legacy `organization_membership.role` column and
`organization_role` PostgreSQL enum are removed by migration `0021`; runtime code no
longer reads or writes the removed column.

This is intentionally a clean alpha-stage cutover rather than a long-lived compatibility
layer. Existing role names such as `student`, `advisor`, and `company_admin` remain as
managed RBAC role keys in the public application contract.

## Implementation

- Added a single primary-role marker per membership while preserving support for
  additional scoped role assignments.
- Added idempotent Workspace Core seeding for managed roles, member types, and core
  permissions.
- Organization creation, onboarding approval, and invite redemption now provision the
  membership's primary role, primary member type, and workspace profile atomically.
- Organization, academic, attendance, internship, request, placement, evaluation, and
  report repositories now derive authorization roles through RBAC joins.
- Added reusable integration fixtures that create complete Core membership records.
- Updated the program-chair schema comment so it describes the new multi-role model.

## Migration safety

Migration `0021_thin_omega_flight.sql` selects one deterministic primary assignment for
each existing membership, creates a partial unique index enforcing that invariant, then
drops the legacy role column and enum. The full migration chain was applied successfully
to a fresh PostgreSQL 17 database and `drizzle-kit check` passed.

## Verification

- Dependency audit: 312 packages checked, no known vulnerabilities.
- Formatting: all changed tracked files passed Prettier. The repository-wide formatting
  command remains blocked only by the pre-existing untracked
  `docs/database-architecture.md`, which was deliberately left untouched.
- TypeScript type-check, ESLint, server build, client production build: passed.
- Unit tests: 197 server and 78 client tests passed (275 total).
- Database integration tests: 46 passed, including 18 authenticated cross-tenant/role
  escalation cases and 10 terminal/duplicate-state abuse cases.
- Disposable Kali black-box checks against the local API confirmed protected routes
  return 401, sensitive/path-traversal probes return 404, attacker origins receive no
  CORS grant, the trusted origin is allowed, security headers are present, and auth rate
  limiting returns 20 successful responses followed by five 429 responses.

## Limitations

- A fresh Docker image build stalled without CPU activity during `bun install`, matching
  the existing local Docker limitation. The current source was still verified through
  native production builds, a fresh database migration, database-backed tests, and a
  disposable Kali black-box pass against the running current server source.
- External LINE, SMTP, and production infrastructure were not exercised because they
  require live third-party systems and credentials.
