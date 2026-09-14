# Landing Page Editorial Refresh

## Summary

Refined the React landing page to closely match the approved Trainy concept site while
preserving the production application's LINE sign-in, localization, accessibility,
and semantic design tokens.

## Design changes

- Adopted the reference site's spacious editorial navigation and hero composition.
- Added the large lime orbit and tilted dark mobile workspace preview.
- Replaced the proof strip with a compact product-capability ribbon.
- Rebuilt the `#why` section as three quiet, generously spaced role cards.
- Kept the existing workflow, role, security, and conversion content below the new
  opening narrative.
- Added responsive behavior and reduced visual density without adding dependencies.

## Verification

- Inspected the desktop hero and `#why` section in a live local browser preview.
- `bun run --cwd client type-check`: passed.
- Focused landing, token, and Badge tests: 4 passed, 0 failed.
- `bun run --cwd client lint`: passed.
- `bun run --cwd client build`: passed; 2,086 modules transformed.
