# Client shell and confirmation accessibility

## Scope and outcome

- Aligned student and advisor primary navigation with the version 0.2 product requirements.
- Added a persistent mobile bottom navigation while retaining secondary workflow links in the desktop sidebar.
- Added an interactive top-right account menu with Profile, Settings, Help, and Sign out. Destinations that do not yet exist are visibly disabled instead of linking to a broken route.
- Improved the shared confirmation dialog with unique accessible labels, focus containment, Escape handling, trigger-focus restoration, scroll locking, and a mobile bottom-sheet layout.

## Files changed

- `client/src/features/dashboard/app-dashboard.tsx`
- `client/src/features/dashboard/dashboard-navigation.ts`
- `client/src/features/dashboard/app-dashboard.test.ts`
- `client/src/features/organizations/role-navigation.ts`
- `client/src/components/ui/confirmation-dialog.tsx`
- `client/src/components/ui/confirmation-dialog.test.tsx`
- `client/src/i18n/messages.ts`

## Decisions and limitations

- Existing authenticated routes and real API integration were preserved.
- Student History, advisor Students, advisor Profile, Settings, and Help remain disabled until their real routes and contracts exist.
- No dependencies, fonts, server APIs, or authentication behavior changed.

## Verification

- `bun run --filter client test` — passed, 57 tests.
- `bun run --filter client lint` — passed.
- `bun run --filter client build` — passed.
- `git diff --check` — passed.

## Commit information

- Not committed separately; this slice is part of a coordinated multi-agent implementation.
