# Auth Assessment

Sign-up / sign-in module: NestJS + MongoDB API and a React frontend, in a pnpm + Turbo monorepo. Requirements are in [`Full_Stack_Test_Task.pdf`](./Full_Stack_Test_Task.pdf).

> **Status:** work in progress. The workspace, Docker dev stack, database package, shared contract, and a Vite React scaffold are in place. The auth endpoints and auth screens are not built yet.

## Layout

| Path | Package | What it is |
| --- | --- | --- |
| `apps/api` | `@repo/api` | NestJS 12 API (ESM) |
| `apps/web` | `@repo/web` | React + Vite frontend (scaffold; auth screens pending) |
| `packages/db` | `@repo/db` | Prisma 6 schema and client for MongoDB (server-only) |
| `packages/contract` | `@repo/contract` | Shared Zod schemas and inferred request/response types (browser-safe) |

Feature plans, task checklists, and change logs live in `plans/`; auth is in `plans/auth/`.
AI usage, corrections, and my human decisions are recorded in [`AI.md`](./AI.md).

## Prerequisites

- **Docker Desktop**. Everything runs in containers.
- **Node 26 and pnpm 11** on the host. You need them to install dependencies (this updates `pnpm-lock.yaml`), to give your editor types and Oxlint, and to run the root scripts. The apps don't run on the host.

## Quick start

```bash
pnpm install   # host: lockfile, editor types, Oxlint
pnpm dev       # builds images and starts mongo, db, api in the foreground
```

The API is at http://localhost:3000 and the web app at http://localhost:5173. Stop the stack with `Ctrl+C`, or run `pnpm dev:down`.

No `.env` file is needed: `compose.yaml` provides development defaults.

## Services

| Service | Port (localhost only) | What it does |
| --- | --- | --- |
| `mongo` | 27017 | MongoDB 8, single-node replica set `rs0` (Prisma needs transactions) |
| `db` | 5555 (Prisma Studio) | Generates the Prisma client and pushes the schema to the dev and test databases, then rebuilds `packages/db` on change (`tsup --watch`) |
| `contract` | — | Rebuilds the shared schemas/types on change (`tsup --watch`) |
| `web` | 5173 | Vite dev server with HMR; scaffold ready for the auth screens |
| `api` | 3000 | Runs Nest via `nodemon` → `nest start` (SWC builder from `nest-cli.json`). It restarts when `apps/api/src`, the built `@repo/db`, the generated Prisma client, or the built `@repo/contract` changes |

Source code is bind-mounted into the containers, so edits apply immediately. Each container has its own `node_modules`; your host's `node_modules` is never used inside them.

## Everyday workflows

| Task | Do this |
| --- | --- |
| Edit API code | Save. The API restarts in about a second. |
| Edit `packages/db/src` | Save. `db` rebuilds and the API restarts. |
| Edit `packages/contract/src` | Save. `contract` rebuilds and the API restarts. |
| Edit `apps/web/src` | Save. Vite HMR updates the browser. |
| Change the Prisma schema | `pnpm db:generate && pnpm db:push` (the API restarts after generation) |
| Add/upgrade a dependency | `pnpm --filter <pkg> add <dep>` on the host, then restart `pnpm dev` (it rebuilds images and refreshes container `node_modules`) |
| Inspect data | `pnpm db:studio`, then open http://localhost:5555, or connect any Mongo client to `mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true` |
| Start from an empty database | `docker compose down -v` (deletes all Mongo data), then `pnpm dev` |

## Scripts

Run from the repo root. Everything except `dev`, `dev:down` and `infra:*` runs inside the running containers, so start `pnpm dev` first.

| Script | What it does |
| --- | --- |
| `pnpm dev` | Build images, renew `node_modules` volumes, and start all services |
| `pnpm dev:down` | Stop and remove the containers (Mongo data is kept) |
| `pnpm build` | Build all packages and apps (Turbo) |
| `pnpm lint` | Oxlint for the whole workspace |
| `pnpm typecheck` | `tsc --noEmit` for the whole workspace |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:push` | Push the schema (indexes) to the dev database |
| `pnpm db:studio` | Prisma Studio on http://localhost:5555 |
| `pnpm infra:dev` / `pnpm infra:dev:down` | Start/stop MongoDB only |

## Shared contract

`@repo/contract` is the single source of truth for the API's HTTP shapes and validation rules. It exports:

- `signUpInputSchema` / `SignUpInput` — email, name (3+), password (8+, letter, number, special), and matching password confirmation
- `signInInputSchema` / `SignInInput` — email and password
- `userSchema` / `PublicUser` — the public user shape (no password hash)
- `authResponseSchema` / `AuthResponse` — access token plus user (the auth plan replaces this with `{ user }` and an httpOnly session cookie)
- `apiErrorSchema` / `ApiError` — shared error response

Planned additions (see `plans/auth/`): `forgotPasswordInputSchema`/`ForgotPasswordInput`, `resetPasswordInputSchema`/`ResetPasswordInput`, and the token-free `AuthResponse`.

Nest validates request bodies with these schemas through `StandardSchemaValidationPipe`; the web app will use the same schemas with `zodResolver`. Do not duplicate these rules in app code.

## Tests

```bash
pnpm test                                                        # unit tests (API + contract)
docker compose exec api pnpm --filter @repo/api test:e2e         # e2e tests
docker compose exec api pnpm --filter @repo/api exec vitest run src/app.controller.spec.ts
```

Tests run against a separate `assessment_test` database. Both Vitest configs set `MONGODB_URI` to `MONGODB_TEST_URI`, so tests never touch dev data. The `db` container pushes the schema to the test database when it starts.

## Environment variables

Docker dev sets these in `compose.yaml`. The `.env.example` files in `apps/api` and `packages/db` show the values to use if you run something on the host instead.

| Variable | Used by | Docker dev value |
| --- | --- | --- |
| `MONGODB_URI` | api, db | `mongodb://mongo:27017/assessment?replicaSet=rs0` |
| `MONGODB_TEST_URI` | api, db (tests) | `mongodb://mongo:27017/assessment_test?replicaSet=rs0` |
| `PORT` | api | `3000` |
| `JWT_SECRET` | api | `dev-only-change-me` (override from your shell) |
| `JWT_EXPIRES_IN` | api | `1h` |
| `WEB_ORIGIN` | api (CORS/trusted origin) | `http://localhost:5173` |
| `VITE_API_URL` | web | `http://localhost:3000` |

The auth plan switches from bearer JWT to `@nestjs/authentication` httpOnly session
cookies. It removes `JWT_SECRET`/`JWT_EXPIRES_IN`, adds `APP_URL` for reset links and
optional `SMTP_URL`, and updates the Compose env when implemented.

## API

| Method | Path | Auth | Status |
| --- | --- | --- | --- |
| `GET` | `/` | none | Scaffold endpoint, returns `Hello World!` |
| `POST` | `/auth/signup` | none | Planned: 201 user + httpOnly session cookie; 400 for invalid input, 409 for duplicate email |
| `POST` | `/auth/signin` | none | Planned: 200 user + session cookie; 401 for bad credentials |
| `POST` | `/auth/forgot-password` | none | Planned: 202 generic response for known and unknown emails; 400 for invalid input |
| `POST` | `/auth/reset-password` | none | Planned: 200 user + session cookie (signed in); 400 for invalid, expired, or used token |
| `POST` | `/auth/sign-out` | session cookie | Planned: 204 and clear the cookie |
| `GET` | `/users/me` | session cookie | Planned: 200 with user; 401 without a valid session |

## Troubleshooting

- **A new dependency isn't found in a container.** Restart with `pnpm dev`; plain `docker compose up` keeps the old `node_modules` volumes.
- **`pnpm build`/`test` says the service isn't running.** Start the stack with `pnpm dev` first.
- **The API doesn't reflect a schema change.** Run `pnpm db:generate` (and `pnpm db:push` for new indexes).
- **Forgot-password link:** in Docker dev the API logs the reset URL; check `docker compose logs api` (production email delivery is not wired yet).
