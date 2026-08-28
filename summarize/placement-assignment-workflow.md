# Placement creation and assignment workflow

## Scope

- Added the `/app/placements` role-aware frontend route.
- University admins and coordinators can create a placement from an accepted application and set the training period.
- University managers can assign an active advisor from their own university.
- Company admins can assign an active supervisor from their own company.
- Students and authorized organization staff can view placement details and assignment status.
- University managers can activate, complete, or cancel according to valid transitions.
- Placement and organization member list responses now include safe display details after authorization.

## Security rules

- Eligible assignees are selected only from active members returned by the protected organization endpoint.
- The backend revalidates organization, role, placement status, and both assignments for every mutation.
- Activation remains unavailable until both advisor and supervisor are assigned.
- Terminal placements expose no further state actions.

## Verification

- Client tests: 21 passed during implementation.
- PostgreSQL integration tests: 14 passed across all repository suites.
- Client production build and lint passed.
- Client and server TypeScript checks passed.
- Dependency audit: 308 packages checked, no known vulnerabilities.

## Follow-up

- Add confirmation dialogs for placement cancellation and completion.
- Connect progress reports, documents, and evaluations to active placements.
