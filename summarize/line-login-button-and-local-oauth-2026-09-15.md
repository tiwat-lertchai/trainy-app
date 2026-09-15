# LINE Login Button and Local OAuth

## Scope

Repaired the LINE sign-in entry point on the Trainy authentication page and aligned
its presentation with the official LINE Login button design guidelines.

## Changes

- Changed the LINE completion callback from an origin-derived absolute URL to the
  origin-relative `/app` path. Better Auth now accepts the callback without expanding
  the redirect allowlist.
- Added visible error and pending handling to the LINE sign-in action.
- Replaced the generic outline control with a dedicated LINE Login button using the
  official, unmodified 44 dp LINE icon from LINE's downloadable template.
- Applied LINE's required `#06C755` base color, 10% black hover layer, 30% black
  pressed layer, preserved icon proportions, and used the approved short Thai label
  `ล็อกอิน`.
- Changed the ignored local `.env` public URLs to `http://localhost:8081` so cookies,
  CORS, the API origin, and the OAuth callback share one local origin. No secret was
  added to a tracked file.

## Verification

- Prettier completed successfully.
- Client TypeScript checks completed successfully.
- Client lint completed successfully.
- All 65 client tests passed, including the dedicated relative-callback assertion.
- The client production build completed successfully.
- Docker rebuilt and started the client, server, and database successfully.
- A black-box request returned HTTP 200, a LINE authorization URL, a localhost
  callback, and PKCE using S256.
- Browser verification confirmed the new button is visible and clicking it navigates
  to `access.line.me`.
- A disposable Kali container confirmed the auth page and valid LINE initiation return
  HTTP 200 with PKCE S256, unsafe absolute callbacks return HTTP 403, and foreign
  origins do not receive CORS permission. The container was removed automatically.

## External requirement

LINE currently rejects the otherwise valid authorization request because this local
callback has not been registered for the LINE Login channel:

`http://localhost:8081/api/auth/callback/line`

Add that exact URL to the LINE Login channel's callback URLs before local end-to-end
authentication can complete. Keep the production callback registered as well.

## Sources

- <https://www.line.me/en/logo>
- <https://developers.line.biz/en/docs/line-login/login-button/>

## Commit

Planned commit: `fix(auth): repair LINE login button and local callback`
