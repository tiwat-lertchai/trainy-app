# Multi-tenant workspace platform design

## Scope

Created a target product and architecture design for evolving Trainy into a multi-tenant Workspace platform. The design covers identity, organization membership, member types, roles and permissions, invitations, verification, profile grants, module boundaries, tenant isolation, onboarding and switching UX, the target data model, API boundaries, security, phased migration, and MVP/V1 scope.

## Files changed

- `docs/multi-tenant-workspace-design.md`: new Thai-first architecture and product design reference.
- `summarize/multi-tenant-workspace-platform-design-2026-09-18.md`: this task summary.

The existing root `design.md` remains unchanged because it is the active Trainy visual design-system reference.

## Important decisions

- Use Workspace as the product term while retaining the existing `organization` database and API naming during migration.
- Evolve the current modular monolith instead of rewriting it or introducing microservices.
- Split member type from authorization roles and add explicit permission/resource scopes.
- Separate personal profiles from organization-specific profiles and govern shared fields through purpose-specific profile grants.
- Keep Internship as a domain module over the Trainy Core platform.
- Use additive schema changes, shadow authorization, cohort cutover, and forward reconciliation.

## Dependency changes

None.

## Verification

- Reviewed the current Drizzle schemas and migration snapshot documentation, including the 37-table `0018` baseline.
- Compared the proposed migration map with the current organization, onboarding, invitation, profile, internship, evaluation, notification, and audit structures.
- Markdown formatting was checked with the repository Prettier configuration.

## Known limitations

- Production row counts, data quality, existing enum usage, and policy decisions still require confirmation before migrations are written.
- This task changes documentation only; no runtime behavior or database schema changed.

## Commit information

No commit was created as part of this task.

## Suggested next steps

Confirm the open policy decisions in the design, then convert the target model into an additive Drizzle migration plan beginning with member types, role assignments, workspace profiles, and verification claims.
