# Landing Workspace UI Refresh

## Scope and outcome

Refreshed the production React landing page to use a workspace-oriented product
preview inspired by the established Trainy student portal structure. The existing
Trainy Ink, Paper, and Lime semantic color tokens remain unchanged.

## Files changed

- `client/src/routes/index.tsx`: replaced the tilted phone mockup with a responsive
  workspace preview containing navigation, internship progress, the next required
  action, and compact metrics; refined the hero proportions, feature cards, and
  workflow section surfaces.
- `summarize/landing-workspace-ui-refresh-2026-09-16.md`: recorded this delivery.

## Important decisions

- Preserved all existing sign-in, localization, mobile menu, navigation, and content
  behavior.
- Reused the repository's semantic design tokens instead of introducing or changing
  colors.
- Kept the preview presentational so it does not imply a new backend contract.
- Added no dependencies.

## Verification

- `bun audit`: passed; no vulnerabilities found in 312 checked packages.
- `bun run --cwd client type-check`: passed.
- `bun test client/src/routes/-index.test.ts client/src/design-tokens.test.ts`: passed;
  3 tests, 0 failures.
- `bun run --cwd client lint`: passed.
- `bun run --cwd client build`: passed; 2,091 modules transformed.
- Live browser inspection at the desktop viewport: passed for hierarchy, content,
  navigation landmarks, and the workspace preview.

## Known limitations

- No screenshot regression suite is configured in the repository; responsive behavior
  relies on the existing Tailwind breakpoints and was reviewed structurally.

## Commit information

Local commit message: `feat(landing): adopt workspace-oriented preview`.

## Suggested next step

Review the landing page on a physical 360 px-wide device and tune copy wrapping only
if Thai text differs from the tested browser font rendering.
