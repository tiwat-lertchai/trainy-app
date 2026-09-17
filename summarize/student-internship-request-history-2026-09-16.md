# Student internship request history

## Outcome

Student internship requests are now split by lifecycle state:

- The self-arranged request page shows only active workflow items: drafts, submitted requests, and revision requests.
- The student History destination shows terminal items: approved, rejected, and cancelled requests.

This moves both approved and cancelled cards out of the request form page while preserving their dates, company details, status, and approval-step indicators.

## Changed areas

- Added a typed terminal-status presentation rule and regression coverage.
- Added the `/app/history` route and connected the existing student History navigation item.
- Added active/history filtering to the internship request panel.
- Added Thai and English history headings, descriptions, and empty states.
- Updated dashboard navigation coverage for the newly available route.

No backend, database, API, or dependency changes were required.

## Verification

- Focused internship-request and dashboard-navigation tests: passed, 9 tests.
- `bun run type-check`: passed for all workspaces.
- `bun run lint`: passed.
- `bun run test`: passed (server 179 tests; client 72 tests).
- `bun run build`: passed for all workspaces and generated the `/app/history` route bundle.
- `git diff --check`: passed.

## Commit information

Not committed separately because the working tree also contains the related, uncommitted university-administrator authorization work. The history files remain reviewable as a distinct UI change.
