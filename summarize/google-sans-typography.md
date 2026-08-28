# Google Sans typography

## Scope

- Replaced the global client font stack with self-hosted Google Sans.
- Added Latin and Thai subsets for weights 400, 500, 600, and 700.
- Applied the same family through the Tailwind `font-sans` theme token and the
  document body, covering the landing page and authenticated application.
- Extended the Vite development file allow-list only to the hoisted
  `@fontsource/google-sans` package directory. The rest of the monorepo remains
  unavailable through `/@fs/`.

## Dependency and security decisions

- Added `@fontsource/google-sans@5.3.1` (OFL-1.1, zero runtime dependencies).
- Font files are bundled by Vite and served from the application origin. No
  Google Fonts or third-party CDN request occurs at runtime, and the existing
  production CSP `font-src 'self' data:` remains unchanged.
- Only the used normal-style Latin/Thai subset files and weights are imported.

## Verification

- `bun run type-check`: passed.
- `bun run lint`: passed.
- `bun run test`: passed (144 server and 45 client tests).
- `bun run build`: passed; generated local Latin/Thai WOFF/WOFF2 assets.
- Browser smoke test: body and heading computed to Google Sans, and browser
  font checks passed for Latin 400, Thai 400, and Thai 700.
- `bun audit`: no vulnerabilities across 310 packages.
- Touched-file Prettier check: passed.

The repository-wide format check was temporarily blocked by concurrent,
unstaged mobile-navigation edits in `client/src/features/dashboard/app-dashboard.tsx`.
Those files were not edited or included in this change.
