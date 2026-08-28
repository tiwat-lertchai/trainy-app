# Trainy Client

React + TypeScript frontend for Trainy, built with Vite. See the root
[README](../README.md) for setup and the shared API contract at
[`server/docs/api-reference.md`](../server/docs/api-reference.md).

## Development

From the repository root:

```bash
bun run dev:client
```

Runs at [http://localhost:5173](http://localhost:5173).

## Verification

```bash
bun run type-check
bun run lint
bun test src
bun run build
```
