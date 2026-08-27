# Organization Role Context

## Outcome

Updated the organization list contract to return the current user's active
membership with each organization. The client now derives navigation from the
selected tenant-scoped role instead of guessing from organization type.

## Changes

- Repository queries now select `{ organization, membership }` for active
  memberships belonging to the authenticated user.
- Added unit and integration coverage for role data and suspended membership
  exclusion.
- Documented the membership-aware response and why roles remain tenant-scoped.
- Added tested client navigation policies for all six Trainy roles.
- Updated the dashboard to show the active organization, role, and allowed
  product areas.

## Security decisions

Frontend navigation is an experience control only. Every protected operation
continues to rely on backend tenant and role authorization. Suspended
memberships are excluded by the database query, and roles are not copied to the
global Better Auth user record.

## Dependencies

None. `bun audit` reported no vulnerabilities across 308 packages.

## Verification

- `bun run test`: Passed; 75 unit tests total (67 server, 8 client).
- `bun run --cwd server test:integration`: Passed; 12 database tests.
- `bun run type-check`: Passed.
- `bun run lint`: Passed with no warnings.
- `bun run build`: Passed for all workspaces.
- `bun audit`: Passed with no vulnerabilities.
- `git diff --check`: Passed.

## Environment

Integration tests ran against the repository's temporary PostgreSQL 17 Compose
service on localhost port 5433 after applying migrations to that test database.

## Next step

Add organization selection persistence and implement the internship/application
workflow with route guards backed by server authorization.
