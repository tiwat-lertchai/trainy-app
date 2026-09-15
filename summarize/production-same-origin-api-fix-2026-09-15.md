# Production Same-Origin API Fix

## Scope

Fixed the deployed client attempting to call `http://localhost:8081` from the HTTPS
production page, which was correctly blocked by the browser's Content Security Policy.

## Root cause

The API URL was embedded into the client bundle at build time. A local Docker value
could therefore leak into a production build and make every browser call the viewer's
own localhost instead of the deployed Trainy server.

## Changes

- Added one shared server URL resolver for the API client and Better Auth client.
- Production builds now always use the current page origin. This matches the Nginx
  `/api` reverse proxy and the existing `connect-src 'self'` policy.
- Development can still use `VITE_SERVER_URL` for a separate local API process.
- Added tests proving that production ignores an accidentally embedded localhost URL,
  development honors an explicit API URL, and non-browser tooling has a stable fallback.
- Kept the Content Security Policy strict; no external connection allowance was added.

## Cloudflare console message

The separate Cloudflare Insights error in the supplied screenshot is an analytics
script being blocked by Trainy's strict CSP. It does not cause authentication to fail
and this change intentionally does not weaken the policy to permit that optional script.

## Verification

- Dependency audit passed with no known vulnerabilities across 312 packages.
- Prettier, client TypeScript checks, and client lint passed.
- All 68 client tests passed.
- The client production build and Docker rebuild completed successfully.
- The rebuilt production bundle contains no embedded `http://localhost:8081` URL.
- A disposable Kali container confirmed the same-origin CSP remains enforced, LINE
  initiation returns HTTP 200, and an unsafe external callback returns HTTP 403. The
  container was removed automatically.

## Commit

Planned commit: `fix(client): keep production API requests same-origin`
