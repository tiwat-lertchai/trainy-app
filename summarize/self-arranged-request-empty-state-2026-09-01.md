# Self-arranged internship request empty-state CTA — 2026-09-01

## Outcome

Fixed the student applications empty state so a student with no applications can immediately choose either workflow:

- Primary: submit a self-arranged internship request.
- Secondary: browse published internship positions.

The primary action routes to the existing real request form at `/app/internship-request`; no duplicate form or backend endpoint was introduced.

## Changes

- `client/src/features/applications/application-page.tsx`
  - Places both actions inside the empty card when application count is zero.
  - Adds clear plus/search icons.
  - Keeps the same actions in the page header once applications exist, avoiding duplicate CTAs.
- `client/src/features/applications/application-navigation.ts`
  - Adds a pure role/count presentation rule for action placement.
- `client/src/features/applications/application-navigation.test.ts`
  - Covers empty-state, populated-state, non-student, and loading behavior.

Existing Thai and English strings already described the self-arranged request accurately, so no translation-key change was required.

## Verification

- Targeted navigation tests: 3 passed.
- Full client suite: 53 passed.
- Client production build: passed.
- ESLint: passed.
- Browser-based inspection of the deployed domain was attempted but blocked by the browser-control security policy. The deployed site will remain visually unchanged until this commit is deployed.

## Dependencies and security

No dependency, backend, database, authentication, or authorization change. No credential was introduced.

## Commit

Committed locally as `fix(applications): expose self-arranged request action`. Not pushed.
