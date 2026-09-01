# Neon test database workflow

Trainy already uses the transaction-capable Neon WebSocket pool in application
code. This workflow makes the database target explicit and adds a destructive
mistake guard before migrations run.

## Create the isolated target

Create a separate Neon project or branch for testing. Do not reuse the
production branch. Copy its **pooled** connection string; repositories use real
transactions and row locks, so the stateless Neon HTTP driver is not suitable.

Copy the example without committing the result:

```sh
cp server/.env.neon-test.example server/.env.neon-test
```

Set `DATABASE_URL` to the pooled test-branch URL with `sslmode=require`. Set
`NEON_TEST_HOST` to the exact hostname from that URL. The preflight also
requires `DATABASE_DRIVER=neon` and `DATABASE_ENVIRONMENT=test`; a different
host or environment stops execution before migration.

For an explicitly authorized production branch that will be reset after the
test, use `DATABASE_ENVIRONMENT=production-resettable` together with
`NEON_ALLOW_PRODUCTION_RESET=true`. Both values and the exact host match are
required. This escape hatch must never be enabled for routine deployments.
The Compose override forwards this flag explicitly and defaults it to `false`.

## Verify and prepare schema

From `server/`:

```sh
bun --env-file=.env.neon-test run db:neon:check
bun --env-file=.env.neon-test run db:neon:prepare
```

`db:neon:prepare` runs the guarded connection check, all Drizzle migrations,
the idempotent seed, and a final connection check. It prints database identity
but never prints the password or full connection string.

## Run the API directly

```sh
bun --env-file=.env.neon-test run dev
```

## Run the Docker stack against Neon

From the repository root:

```sh
docker compose --env-file server/.env.neon-test \
  -f compose.yaml -f compose.neon-test.yaml \
  up --build server client
```

The override removes the server's local `db` dependency. Server startup runs
the same guarded check before migrations and seed. Only `server` and `client`
are targeted, so the local Postgres service is not started.

To return to local Docker PostgreSQL, stop the override stack and use the base
Compose file normally:

```sh
docker compose --env-file server/.env.neon-test \
  -f compose.yaml -f compose.neon-test.yaml down
docker compose up --build
```

## Safety and lifecycle

- Keep `server/.env.neon-test` local; it is ignored by Git.
- Use a Neon role and branch dedicated to tests.
- Reset or delete the test branch through Neon when test data must be removed.
- Uploaded documents are not stored in Neon. Keep `UPLOAD_DIR` ephemeral for
  tests or clean it separately.
- Run migrations before application traffic after switching targets.
