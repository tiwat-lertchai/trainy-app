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

## Runtime follow-up

The user reported that the action still did not appear after starting the app. The running Docker images were from 31 August 18:03, before the UI commit, so plain `docker compose up` reused the stale bundle. Rebuilt both production images from current `master` and force-recreated the client/server containers.

The first Neon override restart then exposed a separate configuration bug: `compose.neon-test.yaml` did not forward `NEON_ALLOW_PRODUCTION_RESET`, so the target guard correctly terminated the server and nginx could not resolve its upstream. The override now forwards the flag explicitly and defaults it to `false`; the example and operator documentation were updated.

After recreation:

- Client and server containers are healthy and remain running.
- `/api/v1/health/ready` returned database connected.
- Server startup completed guarded Neon identity check, migrations, idempotent seed, and a second identity check.
- The nginx-served production bundle contains the Thai self-arranged-request CTA string.
- Compose configuration asserts the flag is `true` for the authorized resettable run and the local database dependency is absent.

Direct verification of `trainy.snoowy.page` was not possible from the tool environment because its DNS lookup failed. Local port 8081 is serving the corrected bundle; the external tunnel/DNS path must resolve on the user's machine.

## Dependencies and security

No dependency, backend, database, authentication, or authorization change. No credential was introduced.

## Commit

Committed locally as `fix(applications): expose self-arranged request action`. Not pushed.
