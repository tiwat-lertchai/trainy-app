# syntax=docker/dockerfile:1

# Whole-monorepo context is needed because "server" and "client" are Bun
# workspace packages that depend on the local "shared" package.
FROM oven/bun:1 AS build
WORKDIR /app

COPY . .
# Installing at the workspace root also runs the root "postinstall" script
# (turbo build --filter=shared --filter=server), which compiles shared/dist
# and server/dist.
RUN bun install --frozen-lockfile

FROM oven/bun:1-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/bun.lock ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/shared ./shared
COPY --from=build /app/server ./server

WORKDIR /app/server
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD bun -e "fetch('http://localhost:3000/api/v1/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Migrations run on container start so a fresh database is brought up to date
# automatically; drizzle-kit is a devDependency but is present because the
# build stage installs the full workspace, not a pruned production tree.
CMD ["sh", "-c", "bun run db:migrate && bun run dist/index.js"]
