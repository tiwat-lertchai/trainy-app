# Dashboard Workspace Redesign

## Scope and outcome

Redesigned the authenticated Trainy workspace shell and role-aware overview dashboard
using the student and advisor prototypes from the mirrored ChatGPT project as the
interaction reference. The dashboard now presents current status, journey progress,
and the next action before secondary metrics so each role can understand what to do
without interpreting generic statistics first.

## Files changed

- `client/src/features/dashboard/app-dashboard.tsx`: rebuilt the shared desktop shell,
  sidebar, sticky header, overview hierarchy, progress journey, next-action panel,
  metrics, organization switcher, and responsive presentation.
- `client/src/features/dashboard/dashboard-data.ts`: added a deterministic role-aware
  mapping from authorized workflow data to a four-stage overview journey.
- `client/src/features/dashboard/dashboard-data.test.ts`: added student and staff
  journey-stage regression coverage.
- `client/src/i18n/messages.ts`: added aligned Thai and English dashboard status,
  action, and journey labels.
- `summarize/dashboard-workspace-redesign-2026-09-16.md`: recorded this delivery.

## Important decisions

- Preserved the existing Trainy Ink, Paper, and Lime semantic color system.
- Kept the existing API requests, authorization boundaries, route mapping, locale
  behavior, account menu, and workspace selection behavior.
- Used only data already returned by authorized APIs. The UI does not invent dates,
  deadlines, responsible people, or workflow records.
- Applied the new shell to every authenticated child dashboard route while keeping
  feature-page behavior unchanged.
- Added no dependencies.

## Verification

- `bun run --cwd client type-check`: passed.
- `bun test client/src/features/dashboard/app-dashboard.test.ts client/src/features/dashboard/dashboard-data.test.ts client/src/i18n/config.test.ts client/src/design-tokens.test.ts`:
  passed; 14 tests, 0 failures.
- `bun run --cwd client lint`: passed.
- `bun run --cwd client build`: passed; 2,091 modules transformed.
- `bun audit`: passed; no vulnerabilities found in 312 packages.
- `git diff --check`: passed.
- Local browser inspection confirmed the signed-out `/app` boundary still renders and
  does not expose authenticated dashboard content.

## Known limitations

- An authenticated browser session was not available for screenshot-level validation
  of each role. Role mapping, localization, navigation, TypeScript, and production
  rendering are covered by automated checks.
- Upcoming milestones are not shown because the current dashboard APIs do not expose a
  reliable milestone/deadline contract; the redesign deliberately avoids mock data.

## Commit information

Local commit message: `feat(dashboard): clarify role-based workspace overview`.

## Suggested next step

Add an authenticated visual regression fixture for student, advisor, and organization
roles once the repository has an isolated browser-test database and seeded sessions.
