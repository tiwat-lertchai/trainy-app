# Workspace core foundation

## Scope

Added the first additive Trainy Core slice for the multi-tenant Workspace model. The change introduces member types, RBAC roles and permissions, tenant-scoped role assignments, workspace profiles, verification claims, and a deny-by-default workspace access resolver without replacing the currently deployed legacy role enforcement.

## Files and systems changed

- `server/src/db/schema/workspace-core.ts`: new Workspace Core Drizzle schema.
- `server/src/db/schema/organization.ts`: added the composite membership identity needed by tenant-safe foreign keys; the deployed membership status enum remains unchanged.
- `server/src/db/schema/index.ts`: exports the Workspace Core schema.
- `server/drizzle/0019_panoramic_dark_beast.sql`: creates the additive Core tables and enums.
- `server/drizzle/0020_cold_prima.sql`: adds cross-tenant integrity constraints and backfills member types, managed roles, Core permissions, assignments, and workspace profiles from existing memberships.
- `server/drizzle/meta/*`: generated Drizzle migration metadata.
- `server/src/modules/workspace-access/*`: repository, deny-by-default access service, and unit tests.

## Important decisions

- Existing `organization_membership.role` remains the production enforcement source during migration.
- Existing memberships are classified with `source = migration`, but the migration does not falsely create verification decisions.
- Pending and rejected states remain in `verification_claim`; widening the deployed membership enum is deferred until onboarding and API contracts migrate together.
- Composite foreign keys ensure memberships, member types, roles, profiles, grantors, and verification reviewers belong to the same organization.
- Member type and active membership alone never grant a permission.
- Existing role values are mirrored into managed RBAC roles so shadow authorization can be introduced incrementally.

## Security controls

- Tenant isolation is enforced in both repository predicates and composite database constraints.
- Workspace lookup returns a non-enumerating 404 for outsiders.
- Expired role assignments are excluded from resolved access contexts.
- Verification claims cannot be self-reviewed.
- Only one primary member type can be assigned to a membership.

## Dependency changes

None. `bun audit` reported no known vulnerabilities across 312 packages.

## Verification

- `DATABASE_URL=<local-test-url> bun run db:check`: passed.
- Repository type checks: passed.
- Repository lint: passed.
- Server tests: 197 passed.
- Client tests: 78 passed.
- Fresh PostgreSQL 17 migration replay from `0000` through `0020`: passed.
- Database integration suite: 46 passed, including 18 cross-tenant/role-escalation and 10 state-abuse checks.
- Production builds: server, shared, and client passed.
- Changed-file Prettier check: passed.

The aggregate `verify:fast` command stopped at formatting because the pre-existing untracked `docs/database-architecture.md` does not match Prettier. That user-owned file was not modified. All remaining checks were run separately and passed.

## Unverified

- The repository-required disposable Kali self-penetration test was not run because this foundation adds no HTTP route and the new resolver is not wired into an endpoint yet. It must run before endpoint cutover is considered shippable.
- The new access resolver is a foundation; legacy authorization behavior is intentionally unchanged.

## Commit information

Committed with the completed Workspace Core foundation; see the repository history for the final commit identifier.

## Suggested next steps

1. Run migrations and integration tests against the disposable local PostgreSQL database.
2. Add shadow comparisons between legacy role decisions and the new RBAC resolver.
3. Migrate onboarding and invitations to create verification claims and workspace profiles transactionally.
4. Switch endpoint families to the new resolver only after shadow mismatches are resolved.
