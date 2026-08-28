# Production Docker setup for portable deploys

## Scope

Added a real, committed Docker setup so the app can be built and run on any
Docker host, replacing the previous state where the running
`trainy-app-client`/`trainy-app-server` images existed only because of a
transient `docker-compose.security-test.yml` (used for the earlier pentest
exercise, never committed, already deleted from disk).

## Files added/changed

- `server/Dockerfile` — two-stage build on `oven/bun:1` / `oven/bun:1-slim`.
  Installs the whole Bun workspace (needed because `server` depends on the
  local `shared` package), which also builds `shared/dist` and `server/dist`
  via the root `postinstall` script. On container start it runs
  `bun run db:migrate` (drizzle-kit) against `DATABASE_URL` before starting
  `dist/index.js`, so a fresh database is brought up to schema automatically.
  Has a `HEALTHCHECK` against `/api/v1/health/ready`.
- `client/Dockerfile` — builds the Vite app with `oven/bun:1`, taking
  `VITE_SERVER_URL` as a build arg (Vite inlines `VITE_*` at build time, so
  it can't be a runtime env var), then serves the static `dist/` with
  `nginx:1-alpine`.
- `client/nginx.conf` — SPA fallback (`try_files ... /index.html` for
  TanStack Router's client-side routes) plus `Content-Security-Policy` and
  `Permissions-Policy` headers. This closes the client-side header gap that
  [`summarize/localhost-pentest-owasp.md`](localhost-pentest-owasp.md) left
  open pending a hosting decision — `default-src 'self'` with `connect-src`
  templated (via `sed` in the Dockerfile) to the same `VITE_SERVER_URL` the
  JS was built against. Repeated in every `location` block because nginx's
  `add_header` does not inherit into a location that defines its own.
- `compose.yaml` — replaced the old test-only file with a full stack:
  `db` (Postgres 17, named volume), `server`, `client`, plus the original
  `postgres-test` service moved under `profiles: ["test"]` so a plain
  `docker compose up` no longer starts it. All server secrets/config are
  sourced from `.env` (see `.env.example`), required values (`POSTGRES_PASSWORD`,
  `BETTER_AUTH_SECRET`, `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`) fail fast
  via Compose's `${VAR:?message}` syntax if unset.
- `.env.example` — documents every variable `compose.yaml` needs.
- `.dockerignore` — excludes `node_modules`, build output, `.git`, `uploads/`,
  and all `.env*` except `*.env.example`.

## Verification

Ran locally with a throwaway `.env` (dummy `BETTER_AUTH_SECRET`/LINE
credentials, never committed, deleted after testing):

- `docker compose build` — both images build clean (Bun workspace install,
  `tsc -b && vite build` for the client, `postinstall` build for
  shared+server).
- `docker compose up -d` — `db` reports healthy, `server` runs
  `drizzle-kit migrate` successfully against the fresh Postgres container and
  starts; `GET /api/v1/health/ready` → `{"status":"ready","database":"connected"}`.
- `curl http://localhost:8081/` and a deep client-side route both return
  `200` with all five security headers present (fixed after finding the
  nginx `add_header` inheritance issue above — first pass was missing
  headers on `/` and on static assets).
- `Content-Security-Policy`'s `connect-src` correctly resolved to the built
  `VITE_SERVER_URL` (`http://localhost:3001`), confirming the `sed`
  substitution in `client/Dockerfile` works.
- Stack torn down with `docker compose down` after verification; no
  containers or state were left running.

Not exercised: LINE OAuth sign-in (needs real channel credentials) and
multi-host/registry deployment (build was local only).

## Incident during this task

`docker compose up` recreated a pre-existing `trainy-app-db-1` container
(port `5434`, left running from the earlier ad hoc
`docker-compose.security-test.yml` pentest stack) because it shared the same
Compose project name (`trainy-app`, derived from the directory) and service
name. This was not checked for beforehand. Investigated afterward: that
container had no named volume (only an orphaned `trainy-app_server-uploads`
volume remains from the old stack), and the actual dev/prod database lives
in Neon (per `server/.env`'s `DATABASE_URL`), so no real data existed only in
that local container. No recovery action was needed, but this should have
been checked with `docker ps` before running `docker compose up` given a
`trainy-app-db-1` was already running. Flagged to the user directly in chat.

## Known limitations / suggested next steps

1. The server image installs the full Bun workspace (all devDependencies,
   including `client`'s deps) rather than a pruned production tree — larger
   image than strictly necessary, but simpler and correct. Worth revisiting
   if image size becomes a real constraint.
2. No CI pipeline builds/pushes these images yet — this task only covers
   local `docker compose build`/`up`.
3. `UPLOAD_DIR` is a named Docker volume (`uploads`) local to the host
   running `server`; for a real multi-host deploy this should move to
   object storage or a shared volume.
4. The orphaned `trainy-app_server-uploads` volume from the old pentest
   stack was left in place (not deleted) since it wasn't part of this task
   and deleting volumes wasn't authorized.

## Follow-up: same-origin deploy (client + server on one domain)

Changed the design from two separate origins (client on one host/port,
server on another) to a single public origin, at the user's request, since
they plan to deploy client and server under one domain with the API at
`/api`. This also avoids Better Auth's session cookie needing cross-site
cookie handling.

- `client/nginx.conf` — added a `location /api/` block that reverse-proxies
  to `http://server:3000` over the internal Compose network (no path in
  `proxy_pass`, so the `/api/` prefix is forwarded unchanged, matching where
  `server/src/app.ts` mounts its routes). CSP's `connect-src` simplified
  from a templated external origin to plain `'self'`.
- `client/Dockerfile` — dropped the `sed` step that used to bake
  `VITE_SERVER_URL` into the nginx config's CSP; no longer needed now that
  `connect-src` is just `'self'`. The build arg is still used for the Vite
  build itself (`import.meta.env.VITE_SERVER_URL`, read by
  `client/src/lib/api-client.ts` and `auth-client.ts` — both treat it as an
  origin with no path, which is why it works whether the API lives on its
  own host or is proxied under `/api` on the same one).
- `compose.yaml` — removed the server's published port (`3001:3000`); it's
  reachable only from `client` over the internal network now. Local-testing
  defaults for `BETTER_AUTH_URL`/`VITE_SERVER_URL` changed from
  `http://localhost:3001` to `http://localhost:8081` (the client's own
  origin) to match.
- `.env.example` — rewritten to explain that `CORS_ORIGINS`, `BETTER_AUTH_URL`,
  and `VITE_SERVER_URL` are now all the same public URL.

### Bug found and fixed during verification

The `/api/` location had no `add_header` of its own, so per nginx's
inheritance rule (a location only inherits server-level `add_header`s if it
defines none of its own) it was inheriting the client's static-page security
headers **on top of** the server's own (already correct, JSON-appropriate)
headers — duplicate `Content-Security-Policy`, `Permissions-Policy`,
`X-Frame-Options`, etc. on every API response. Fixed by adding one
`add_header X-Proxied-By "trainy-client"` in that location, which is enough
to stop the inheritance; the server's headers now pass through untouched.

### Unrelated volume/password mismatch hit during verification (not a bug in this change)

Re-testing hit `password authentication failed for user "trainy"` on the
`db` service. Cause: the `trainy-app_db-data` volume from the very first
verification pass (earlier in this task) was initialized with that pass's
dummy `POSTGRES_PASSWORD`; Postgres only applies `POSTGRES_PASSWORD` on
first init, so it silently ignored the real password now in `.env`. Fixed
by removing that leftover volume (`docker volume rm trainy-app_db-data`)
before retesting — it held no real data, only schema from the earlier
disposable test run.

### Also noticed, not fixed (user's own `.env`, not committed)

The user's local root `.env` has `CORS_ORIGINS=https://trainy.snowy.page/`
— with a trailing slash. `server/src/config/env.ts`'s `readOrigins` stores
the raw string after validating it's a URL, and the CORS check in
`server/src/app.ts` does an exact-string match against the browser's
`Origin` header, which never has a trailing slash. As written, that origin
would never match and CORS would silently reject the real domain. Flagged
to the user in chat; not changed here since it's their local `.env`, not a
repo file.

## Commits

- `f724f79 feat(docker): add production Dockerfiles and compose stack for portable deploys`
- `24d429c feat(docker): serve client and server from one origin via nginx reverse proxy`
  — both local only, not pushed (per Git workflow rule 8).
