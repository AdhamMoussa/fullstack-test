# @repo/api

NestJS 12 API (ESM). Setup, scripts, environment variables and the endpoint list are in the [root README](../../README.md).

## Development notes

- Runs in the `api` Compose service. `nodemon` restarts `nest start -b swc` when `src/`, `packages/db/dist`, or the generated Prisma client changes.
- SWC is used only for fast dev restarts and does not type-check. `pnpm typecheck` and `nest build` do.
- ESM: relative imports end in `.js`; tests use Vitest (`vi.fn()`, not `jest.fn()`).
- Tests use the `assessment_test` database (`MONGODB_TEST_URI`), never the dev database.

```bash
docker compose exec api pnpm --filter @repo/api test
docker compose exec api pnpm --filter @repo/api test:e2e
```
