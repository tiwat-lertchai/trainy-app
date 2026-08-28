# I18n Interpolation and Academic Page

## Scope and outcome

- Added named interpolation support to the existing type-safe translation function.
- Migrated every user-visible string on the authenticated Academic page to the shared Thai/English dictionary.
- The language toggle now updates the Academic page, including organization-specific descriptive copy, placeholders, errors, and empty states.

## Files changed

- `client/src/i18n/config.tsx`
- `client/src/i18n/config.test.ts`
- `client/src/i18n/messages.ts`
- `client/src/features/academic/academic-admin-page.tsx`

## Decisions

- Translation keys remain constrained by `MessageKey`; interpolation does not loosen key type safety.
- Named `{parameter}` placeholders preserve natural word order in Thai and English.
- Missing interpolation values remain visible as placeholders rather than being silently removed.
- This is the first verified feature slice of the larger authenticated-page i18n pass.

## Dependencies

None. `bun audit` checked 310 packages and found no known vulnerabilities.

## Verification

- `bun test client/src/i18n/config.test.ts` — pass, 3 tests.
- `bun run type-check` — pass.
- `bun run lint` — pass.
- `bun run fmt:check` — pass.
- `bun run build` — pass.
- `git diff --check` — pass.
- Production Docker client image built successfully and served `/app/academic` through nginx on an isolated local port. The temporary container was removed afterward.

## Known limitations

- Other authenticated feature pages still contain hardcoded Thai copy and require migration in subsequent verified slices.
- An authenticated browser account was not available for a role-specific Academic page click-through.

## Suggested next steps

Migrate onboarding and notification surfaces next, followed by the remaining workflow pages in small verified groups.
