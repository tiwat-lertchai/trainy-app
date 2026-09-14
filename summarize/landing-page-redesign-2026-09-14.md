# Landing page redesign

## Scope and outcome

- Rebuilt the public landing page as a complete product narrative instead of a
  hero followed by three summary cards.
- Added a richer action-oriented workspace preview, product proof strip,
  feature grid, four-step workflow, role-specific value cards, security and
  privacy explanation, final call to action, and footer.
- Preserved the real LINE sign-in action and complete Thai/English language
  switching.
- Added an accessible responsive menu with expanded state and Escape handling.
- Added reduced-motion behavior and fixed anchor scroll spacing below the
  persistent header.

## Files changed

- `client/src/routes/index.tsx`
- `client/src/routes/-index.test.ts`
- `client/src/i18n/messages.ts`
- `client/src/index.css`

## Dependencies

- None.

## Verification

- Client TypeScript check, lint, 58 tests, and production build passed.
- The `compose.neon.yaml` images rebuilt successfully; server and client both
  became healthy.
- The live page was visually inspected in the in-app browser at the default
  desktop viewport and at a 360 px responsive viewport.
- Thai and English content, six landing sections, anchor navigation, and the
  absence of horizontal overflow were verified in the live production bundle.
- No new console error appeared after the rebuilt page loaded. Older retained
  browser logs recorded failed API requests from before the Docker stack was
  restarted.

## Known limitations

- Authentication still provides LINE only; email/password UI remains future
  version 0.2 work.
- The landing preview is illustrative and does not expose private live data.

## Commit information

- Planned local commit: `feat(client): redesign public landing page`.
- No push requested or performed.
