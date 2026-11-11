# @repo/api

NestJS 12 API (ESM). Setup, scripts, environment variables and the endpoint list are in the [root README](../../README.md).

## Development notes

- Runs in the `api` Compose service. `nodemon` restarts `nest start` when `src/`, `packages/db/dist`, the generated Prisma client, or `packages/contract/dist` changes.
- SWC is the builder configured in `nest-cli.json` (with `typeCheck`); `pnpm typecheck` remains the full check.
- ESM: relative imports end in `.js`; tests use Vitest (`vi.fn()`, not `jest.fn()`).
- Request validation comes from `@repo/contract` through `StandardSchemaValidationPipe` (no class-validator DTOs).
- Tests use the `assessment_test` database (`MONGODB_TEST_URI`), never the dev database.

```bash
docker compose exec api pnpm --filter @repo/api test
docker compose exec api pnpm --filter @repo/api test:e2e
```
