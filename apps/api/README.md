# API

NestJS 12 ESM app (`@repo/api`). See the root `AGENTS.md` for repo conventions and `Full_Stack_Test_Task.pdf` for requirements.

## Commands

Run from the repo root:

- `pnpm --filter @repo/api dev` — Turbo-managed, no extra watcher
- `pnpm --filter @repo/api start:dev` — standalone watch mode; do not run alongside root `pnpm dev`
- `pnpm --filter @repo/api build`
- `pnpm --filter @repo/api start:prod`
- `pnpm --filter @repo/api lint`
- `pnpm --filter @repo/api typecheck`
- `pnpm --filter @repo/api test`
- `pnpm --filter @repo/api test:e2e`

The API listens on port 3000.
