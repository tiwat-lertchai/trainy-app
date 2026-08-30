# syntax=docker/dockerfile:1

# Whole-monorepo context is needed because "client" depends on the local
# "shared" and "server" workspace packages (the latter for its typed Hono
# client).
FROM oven/bun:1 AS build
WORKDIR /app

COPY . .
RUN bun install --frozen-lockfile

# Vite inlines VITE_* variables into the built JS at build time, so this must
# be a build arg, not a runtime environment variable.
ARG VITE_SERVER_URL=http://localhost:8081
ENV VITE_SERVER_URL=$VITE_SERVER_URL
RUN bun run build --filter=client

FROM nginx:1-alpine AS runtime
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 80

# 127.0.0.1, not "localhost": nginx's `listen 80;` only binds IPv4, and
# wget resolving "localhost" to the IPv6 loopback first gets connection
# refused even though the IPv4 side is serving fine.
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
