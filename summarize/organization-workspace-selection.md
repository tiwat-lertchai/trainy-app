# Organization Workspace Selection

## Outcome

Added a persistent organization switcher for users with multiple active tenant
memberships. The dashboard now changes its role context and navigation when the
user selects another organization.

## Security behavior

The stored organization ID is treated only as a preference. It is restored only
when the latest authenticated API response still contains an active membership;
otherwise the client falls back to the first accessible organization or none.
Backend authorization remains authoritative for every request.

## Verification

- Client tests: 11 passed.
- Client lint: Passed with no warnings.
- Client production build: Passed.
- `bun audit`: No vulnerabilities across 308 packages.
- `git diff --check`: Passed.

## Dependencies

None.

## Next step

Implement the internship and application pages using the selected workspace
context and real typed endpoints.
