# Authorized dashboard data, authenticated shell i18n, and confirmations

## Scope and outcome

- Replaced dashboard placeholder counts and tasks with data from existing,
  authorized APIs. Organization administrators use the tenant-scoped report;
  students use their own placements and applications; other staff use the
  organization placement list allowed by their active membership.
- Added Thai/English keys for the authenticated dashboard shell, navigation,
  role labels, dashboard states, and shared confirmation controls. The locale
  switch is now available inside the authenticated header and persists through
  the existing language provider.
- Added an accessible shared alert dialog before high-impact actions: terminal
  application decisions and withdrawal, internship closure, placement
  completion/cancellation, document approval, and member suspension. Existing
  backend authorization and state validation remain authoritative.

## Files and systems changed

- `client/src/features/dashboard/app-dashboard.tsx`
- `client/src/features/dashboard/dashboard-data.ts` and its tests
- `client/src/i18n/messages.ts`
- `client/src/components/ui/confirmation-dialog.tsx` and its tests
- Application, company internship, placement, document, and organization
  member pages now invoke the shared confirmation dialog.

## Decisions

- No dashboard-specific backend endpoint or dependency was added; the client
  composes existing protected contracts to avoid duplicating authorization.
- Dashboard action counts intentionally reflect pending applications and
  placements only. They are factual workflow counts, not invented deadlines.
- Draft publication and placement activation remain immediate because they are
  non-terminal transitions. Actions that close or finalize a workflow require
  explicit confirmation.

## Dependency changes

None. `bun audit` checked 308 packages and found no known vulnerabilities.

## Verification

- `bun run type-check` — pass for all workspaces.
- `bun run test` — pass: server 112, client 40.
- `bun run lint` — pass.
- `bun run build` — pass for shared, server, and client production output.
- `bun audit` — pass, 308 packages, no known vulnerabilities.
- `git diff --check` — pass.

## Known limitations

- This pass moves the authenticated shell/dashboard and shared confirmation
  copy into the bilingual dictionary. Detailed feature-page body copy remains
  Thai-first and should be migrated feature-by-feature to keep the dictionary
  reviewable and avoid an untested bulk translation.
- No real administrator account was available for a live browser click-through
  of administrator-only confirmations. Rendering, TypeScript, business rules,
  and production bundling are covered by automated verification.

## Commit information

- `a94964c feat(dashboard): add authorized metrics and confirmations`
- Committed locally on `master`; no push performed.

## Suggested next steps

Move each detailed feature page's Thai body copy into scoped message groups,
starting with onboarding and attendance, and add authenticated browser checks
when representative role accounts are available.
