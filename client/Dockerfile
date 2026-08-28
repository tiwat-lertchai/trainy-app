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
ARG VITE_SERVER_URL=http://localhost:3001
ENV VITE_SERVER_URL=$VITE_SERVER_URL
RUN bun run build --filter=client

FROM nginx:1-alpine AS runtime

# Same build arg as above, baked into the CSP's connect-src so the served
# page is allowed to call the API origin the JS was actually built against.
ARG VITE_SERVER_URL=http://localhost:3001
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i "s#__VITE_SERVER_URL__#${VITE_SERVER_URL}#" /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -q -O /dev/null http://localhost/ || exit 1
