# @repo/web

React + Vite frontend with Mantine, TanStack Query, file-based TanStack Router, Axios, and `beforeLoad` auth guards on the `_app`/`_auth` layout routes (backed by the `/users/me` query via `ensureQueryData`). Shared code lives in `src/modules/core` (`lib`, `layouts`, `components`, `pages`); auth code lives in `src/modules/auth` (`layouts`, `pages`, `queries`, `lib`); `src/routes` contains thin route files. The signup, signin, forgot-password, and reset-password screens and the protected `/app` page are implemented. Setup, services, and scripts are in the [root README](../../README.md).

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
