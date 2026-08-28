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

## Commits

- `f724f79 feat(docker): add production Dockerfiles and compose stack for portable deploys`
  — local only, not pushed (per Git workflow rule 8).
