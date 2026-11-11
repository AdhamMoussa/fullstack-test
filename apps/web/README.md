# @repo/web

React + Vite frontend. The scaffold is in place; auth screens are not built yet. Setup, services, and scripts are in the [root README](../../README.md).

Local dev runs from the repo root:

```bash
pnpm dev          # starts web, api, contract, db, and mongo
pnpm dev:down
```

The app is served at http://localhost:5173.

For commands that only involve this package, run them in the `web` container:

```bash
docker compose exec web pnpm --filter @repo/web build
docker compose exec web pnpm --filter @repo/web lint
docker compose exec web pnpm --filter @repo/web typecheck
```
