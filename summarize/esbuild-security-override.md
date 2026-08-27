# Esbuild Security Override

## Outcome

Removed the moderate `GHSA-67mh-4wv8-2f99` development-server vulnerability
reported by `bun audit`. The vulnerable `esbuild@0.18.20` was a transitive
dependency of `drizzle-kit` through `@esbuild-kit/core-utils`.

## Changes

- Added a root-level Bun override that resolves `esbuild` to `0.25.12`.
- Regenerated `bun.lock` with Bun 1.4.0.
- Kept the experiment isolated on `dev-esbuild-security` because the upstream
  package requested an older esbuild range.

## Official guidance

Bun supports top-level `overrides` for transitive dependencies. Nested
overrides are not supported. The selected version is already used by the
current `drizzle-kit` dependency and is outside the vulnerable range.

## Verification

- `bun audit`: Passed; no vulnerabilities found across 308 packages.
- `bun run test`: Passed; 68 tests total (66 server, 2 client).
- `bun run type-check`: Passed.
- `bun run lint`: Passed.
- `bun run build`: Passed for shared, server, and client workspaces.
- `bun run --cwd server db:check`: Passed; Drizzle reported a valid schema.
- `git diff --check`: Passed.

## Known limitations

The override is outside the range requested by `@esbuild-kit/core-utils`, so it
must remain isolated until the user approves integration. All repository checks
and the directly affected Drizzle command passed.

## Next step

Approve merging this compatibility-tested security override into `master`, then
begin the frontend foundation from the updated branch.
