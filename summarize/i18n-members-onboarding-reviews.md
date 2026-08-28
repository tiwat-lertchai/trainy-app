# Members and Onboarding Review I18n

## Outcome

Localized organization member management and onboarding access reviews in Thai and English. Role labels reuse the shared role dictionary, interpolated organization names preserve natural word order, and review dates follow the selected locale.

## Verification

- `bun run test` — pass: 146 server and 46 client tests.
- `bun run type-check`, `bun run lint`, `bun run build`, and `git diff --check` — pass.
- `bun run fmt:check` — blocked by the unrelated uncommitted file `summarize/pentest-invites-internship-requests.md`; changed i18n files were formatted with Prettier.
- No dependencies changed.

## Next step

Continue migrating the main onboarding form and workflow feature pages.
