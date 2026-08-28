# Reports, Notifications, and Invite Redeem I18n

## Outcome

Localized the authenticated Reports page, notification center, and invite redemption flow in Thai and English. Dates now follow the selected locale, report statuses use shared message keys, and invite errors support both locales.

## Files and decisions

- Updated the three feature surfaces, invite presentation rules and tests, and the shared message dictionary.
- Reused named interpolation for counts and organization names while preserving `MessageKey` type safety.
- No dependencies changed.

## Verification

- `bun run test` — pass: 146 server and 46 client tests.
- `bun run type-check`, `bun run lint`, `bun run fmt:check`, `bun run build`, and `git diff --check` — pass.

## Known limitation and next step

Other authenticated workflow pages still require migration. Continue with onboarding and organization members, then the placement, internship, attendance, document, evaluation, progress, and application surfaces.
