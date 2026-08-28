# Internship Browse and Application

## Outcome

Added the first complete internship frontend workflow for students. Authenticated
users can browse published internships and active students can submit a
validated application through the real typed API.

## Changes

- Extended the authenticated shell to render nested product routes.
- Linked role-aware internship navigation to `/app/internships`.
- Added published internship loading, empty, error, deadline, and responsive
  card states.
- Added Thai work-mode and date presentation.
- Added the student application statement form with backend-aligned length
  limits and university membership context.
- Invalidated application queries after a successful mutation.

## Security

The application sends the university ID from the authenticated user's active
student membership. The backend remains authoritative and rejects non-students,
inactive memberships, duplicate applications, closed deadlines, and cross-
tenant attempts.

## Dependencies

None. `bun audit` reported no vulnerabilities across 308 packages.

## Verification

- `bun run test`: Passed; 80 tests total (67 server, 13 client).
- `bun run type-check`: Passed.
- `bun run lint`: Passed with no warnings.
- `bun run build`: Passed for all workspaces.
- `bun audit`: Passed with no vulnerabilities.
- `git diff --check`: Passed.

## Known limitations

- Company internship creation and management are not part of this slice.
- Student application history and withdrawal are not implemented yet.
- API errors currently use a generic localized message rather than the shared
  error-code translation layer planned for the next slices.

## Next step

Implement student application history/withdrawal, then company internship
management and application review.
