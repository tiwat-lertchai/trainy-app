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
bun run type-check
bun run lint
bun run test
bun run build
```

Every change should pass the relevant tests plus type-check, lint, and
build before committing. See [`AGENTS.md`](AGENTS.md) for the full set of
project conventions.
