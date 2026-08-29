# Sidebar overview navigation fix

## Scope and outcome

- Fixed the authenticated sidebar's `ภาพรวม` / `Overview` item so it navigates
  from child pages back to the existing `/app` dashboard route.
- The cause was a missing `overview` entry in the sidebar link mapping. The
  renderer therefore produced a plain button instead of a TanStack Router link.
- Added a regression test for the overview route mapping.

## Files changed

- `client/src/features/dashboard/app-dashboard.tsx`
- `client/src/features/dashboard/dashboard-navigation.ts`
- `client/src/features/dashboard/app-dashboard.test.ts`

## Dependencies

- No dependency or lockfile changes.
- `bun pm scan` could not check advisories because this repository does not
  configure a Bun security scanner. The older `bun pm audit` command is not
  available in the installed Bun version.

## Verification

- `bun run --filter client test` — pass, 47 tests.
- `bun run --filter client lint` — pass with no warnings.
- `bun run --filter client build` — pass; includes `tsc -b` and the Vite
  production build.
- `git diff --check` — pass.

## Known limitations

- No authenticated browser session was available for a manual click-through.
  The route mapping, full client tests, TypeScript compilation, and production
  bundle are verified.

## Commit information

- Local commit message: `fix(client): restore overview sidebar navigation`.
- No push requested or performed.

## Suggested next steps

- Configure a Bun-compatible security scanner in `bunfig.toml` if dependency
  advisory scanning should be part of local verification.
