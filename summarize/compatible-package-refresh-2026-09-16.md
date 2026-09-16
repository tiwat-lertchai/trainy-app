# Compatible package refresh

## Scope and decision

Updated the monorepo's declared root packages and refreshed the Bun lockfile within the repository's existing compatible version ranges. TypeScript 7 was intentionally not selected because it is a major upgrade while the client and TypeScript ESLint toolchain currently constrain TypeScript to the 5.x/6.0-compatible line. A major experiment would require a dedicated experiment branch and migration review.

## Direct dependency changes

- `bun-types`: `^1.4.0` to `^1.4.2`
- `prettier`: `^3.9.6` to `^3.9.7`
- `turbo`: `^2.10.12` to `^2.10.13`
- `hono`: `^4.13.5` to `^4.13.8`

`bun.lock` was regenerated, updating compatible transitive packages. No application code, database schema, deployment configuration, or public API was changed by this package refresh.

## Security and compatibility

- `bun audit`: no vulnerabilities found across 312 checked packages.
- `bun outdated`: only TypeScript 7 remained as a newer major release.
- Existing peer constraints remain satisfied by TypeScript 5.9.3.

## Verification

`bun run verify:fast` passed in full, including:

- dependency audit
- Prettier formatting check
- TypeScript checks
- ESLint
- complete workspace test suite
- production builds

## Known limitations and next steps

The package refresh does not attempt the TypeScript 7 migration. Evaluate that separately on a `dev-<experiment>` branch once the client compiler and TypeScript ESLint compatibility ranges support it.

## Commit information

Prepared as a focused dependency maintenance change. The package manifest, lockfile, and this summary are the only intended files for its commit.
