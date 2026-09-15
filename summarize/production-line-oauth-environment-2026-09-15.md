# Production LINE OAuth Environment

## Scope

Diagnosed the deployed LINE Login HTTP 403 and made the Docker deployment contract
fail closed when public authentication origins are missing.

## Root cause

The deployed client correctly posts to `https://trainy.snowy.page`, but the deployed
server still uses `http://localhost:8081` as its Better Auth base URL. Better Auth
therefore rejects the browser-normalized production callback as `INVALID_CALLBACK_URL`
and generates LINE authorization URLs with a localhost redirect URI.

Direct checks showed:

- Production callback against the deployed server: HTTP 403.
- Relative callback against the deployed server: HTTP 200, but the generated LINE
  redirect URI incorrectly points to localhost.
- Production callback against the corrected local server configuration: HTTP 200.

The public domain does not currently route to the local Docker stack, so recreating
the local server cannot update the deployed server's environment.

## Changes

- `compose.yaml` and `compose.neon.yaml` now require explicit `CORS_ORIGINS` and
  `BETTER_AUTH_URL` values instead of silently defaulting both to localhost.
- `.env.example` documents the fail-closed deployment requirement and clarifies that
  `VITE_SERVER_URL` is only relevant to non-production Vite development.
- The ignored local `.env` now uses `https://trainy.snowy.page` as Better Auth's base
  URL and allows only the production and local Trainy origins. No secret was added to
  Git.

## Required deployed values

```dotenv
CORS_ORIGINS=https://trainy.snowy.page
BETTER_AUTH_URL=https://trainy.snowy.page
```

The LINE Developers Console must also contain this callback URL:

`https://trainy.snowy.page/api/auth/callback/line`

Restart or redeploy the production server after changing its environment.

## Verification

- Both Compose files accept the configured local environment, while an empty
  `CORS_ORIGINS` value is rejected before startup.
- The complete repository verification passed: dependency audit, formatting,
  TypeScript, lint, 68 client tests, 175 server tests, and all production builds.
- A disposable Kali container confirmed the corrected local deployment accepts the
  production callback with HTTP 200, rejects an external callback with HTTP 403,
  generates the production LINE redirect URI, and retains PKCE S256. The container
  was removed automatically.
- A live production retest still returns HTTP 403 until the deployed server's
  environment is corrected and that server is restarted.

## Commit

Planned commit: `fix(auth): require explicit production OAuth origins`
