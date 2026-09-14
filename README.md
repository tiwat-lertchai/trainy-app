# Trainy

Trainy connects students, universities, and companies through one clear
internship (co-operative education / CWIE) workflow — onboarding and
tenant approval, internship publishing and applications, placements,
attendance with optional GPS evidence, progress reports, documents,
evaluations, and organization reporting.

Full API behavior, access rules, and request/response contracts are
documented in [`server/docs/api-reference.md`](server/docs/api-reference.md).

## Stack

- [Bun](https://bun.sh) — JavaScript runtime and package manager
- [Hono](https://hono.dev) — backend API framework
- [Drizzle ORM](https://orm.drizzle.team) + [Neon](https://neon.tech) PostgreSQL — data layer
- [Better Auth](https://www.better-auth.com) with LINE Login — authentication
- [Vite](https://vitejs.dev) + [React](https://react.dev) — frontend
- [Turbo](https://turbo.build) — monorepo build orchestration

## Project structure

```
.
├── client/               # React frontend
├── server/               # Hono backend (see server/docs/api-reference.md)
├── shared/                # Shared TypeScript types between client and server
├── summarize/             # Task-by-task working memory (see summarize/README.md)
└── AGENTS.md              # Project conventions for contributors and agents
```

## Getting started

```bash
# Install dependencies for all workspaces
bun install

# Copy environment variables and fill in the required values
cp server/.env.example server/.env
```

Never commit `server/.env` or any Better Auth secret, LINE credential, or
database connection string.

### Development

```bash
# Run client and server together
bun run dev

# Or run them individually
bun run dev:client
bun run dev:server
```

The client runs at [http://localhost:5173](http://localhost:5173) and the
server at [http://localhost:3000](http://localhost:3000).

### Verification

```bash
# Complete fast, infrastructure-free gate used by CI
bun run verify:fast
```

The fast gate audits the lockfile, checks formatting and TypeScript, lints the
client, runs unit and API contract tests, and creates production builds. The
server and shared packages do not currently have ESLint configurations, so the
lint step covers the client only; TypeScript checks cover all three workspaces.

Database-backed integration tests are a separate gate because they require a
prepared disposable PostgreSQL database:

```bash
bun run --cwd server test:integration
```

Security-relevant changes also require the local OWASP-aligned black-box pass
documented in [`summarize/localhost-pentest-owasp.md`](summarize/localhost-pentest-owasp.md).
Every change should pass the relevant gates before committing. See
[`AGENTS.md`](AGENTS.md) for the full project conventions.

## License

Copyright (C) 2026 Tiwat Lertchai

Trainy is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the
Free Software Foundation, either version 3 of the License, or (at your
option) any later version. See [`LICENSE`](LICENSE) for the full text.

This means anyone who modifies Trainy and runs it as a network service —
including a university or company hosting their own copy — must make the
source of their modified version available to that service's users.
