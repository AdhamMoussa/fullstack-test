# AGENTS.md

## Repo state

- Greenfield full-stack assessment defined by `Full_Stack_Test_Task.pdf` (auth module). If `apps/` is missing, scaffold it using the layout below.
- The PDF is the source of truth. If direct PDF reading is unavailable, extract it with:
  `gs -q -sDEVICE=txtwrite -o - Full_Stack_Test_Task.pdf`
- Submission is a public GitHub repo; keep `README.md` and `AI.md` at the root.

## Tooling

- Use the Context7 MCP for library/framework documentation before implementing APIs or configuration; prefer it over memory or web search.

## Required deliverables

- React + TypeScript frontend: signup, signin, and a protected application page.
- NestJS + MongoDB API: signup, signin, and at least one protected endpoint.
- `README.md`: setup, env vars, scripts, how to run tests, and a short API overview.
- `AI.md` (mandatory per the spec): which code was AI-assisted, effective prompts/approaches, and what you corrected or reworked.

## Workspace

- Use pnpm workspaces + Turbo. Keep a single `pnpm-lock.yaml`; do not add npm or yarn lockfiles.
- Package names: `@repo/web`, `@repo/api`, `@repo/db`, `@repo/contract`. Import across packages by name, never by relative path.
- Target layout:
  - `apps/web` — Vite React app with Mantine, RHF/Zod, Axios, TanStack Query/Router; imports `@repo/contract` only
  - `apps/api` — NestJS 12 ESM app; Dockerfile in `apps/api/Dockerfile`; container `api`
  - `packages/db` — Prisma 6.19.0 schema, generated client, and singleton export; Dockerfile in `packages/db/Dockerfile`; container `db`
  - `packages/contract` — Zod schemas + inferred input/output types; browser-safe
  - `compose.yaml` — `mongo`, `db` (tsup watch), and `api` (nodemon) containers
- Dependency direction: `web -> contract`; `api -> contract + db`; `db` and `contract` must not import each other.
- Shared packages are ESM (`"type": "module"`), built by tsup to `dist`, with `main`/`types`/`exports` pointing at `dist`; apps depend on them with `workspace:*`. Every shared package exposes `build`, `watch`, `lint` (`biome check`), and `typecheck` (`tsc --noEmit`).
- `packages/contract`: one Zod schema per input/output, types via `z.infer`, all exported from `src/index.ts`; tsup `platform: "neutral"`, `external: ["zod"]`.
- `packages/db`: Prisma schema in `prisma/`, generated client in `generated/prisma` (gitignored), globalThis-cached singleton, re-exported Prisma types; no Nest imports. Scripts `generate`/`push`/`studio` (root `db:*` aliases); tsup `platform: "node"`, externalize Prisma runtime.
- `User` is the only DB model: ObjectId `id`, unique normalized `email`, `name`, `passwordHash`, `createdAt`, `updatedAt`. Auth is stateless JWT, so do not add Session/RefreshToken models.
- Shared versions (`typescript`, `@types/node`, `tsup`, `zod`) live in the `pnpm-workspace.yaml` catalog; packages use `"catalog:"`. Allow `prisma`, `@prisma/client`, `@prisma/engines`, `@swc/core`, and `esbuild` install scripts there; pnpm blocks them by default.
- Containers set `pnpm_config_verify_deps_before_run=false` (in `compose.yaml`, not the workspace file) so `docker compose exec` never auto-installs into the container's `node_modules`; the host keeps pnpm's default check.
- API is ESM (`"type": "module"`): use `.js` extensions in relative imports; do not add CommonJS settings.
- Root scripts: `dev`, `dev:down`, `build`, `lint`, `typecheck`, `test`, `db:generate`, `db:push`, `db:studio`, `infra:dev`, `infra:dev:down`.
- Ports: web `5173`, API `3000`, Prisma Studio `5555`, MongoDB `27017`. Publish every port on `127.0.0.1` (Studio has no auth).
- Local dev runs as separate Compose services. `db` runs its `dev` script: `prisma generate` → `db push` to the dev and test DBs → `tsup --watch --onSuccess 'touch /tmp/db-ready'` (the healthcheck waits for that file). `api` runs `nodemon` → `nest start -b swc`, watching `apps/api/src`, `packages/db/dist`, and `packages/db/generated/prisma/index.js`, so package rebuilds and client regeneration restart the API.
- Every app/package gets its own Dockerfile and Compose service; add matching ones for `apps/web`/`packages/contract` when created. Dockerfiles use `pnpm fetch` (lockfile-only layer) → `COPY . .` → `CI=true pnpm install --offline --frozen-lockfile`; do not list per-package `package.json` files. `CI=true` is required or pnpm aborts (no TTY to confirm relinking the fetched store).
- Dev Dockerfiles must install `procps` and services use `init: true`: Nest CLI kills its app child via `tree-kill`, which shells out to `ps`. Without it, restarts orphan the old server and fail with `EADDRINUSE`.
- API nodemon ignores `packages/db/dist/*.d.ts` and `*.map` so one tsup rebuild triggers one restart, not two. No polling: bind-mount file events reach the containers.
- Source is bind-mounted at `/app`; every `node_modules` path is an anonymous volume per service, refreshed from the image by `pnpm dev` (`--renew-anon-volumes`). Do not switch them to named volumes; Docker only seeds named volumes once, so new dependencies would never appear.
- `packages/db/generated` lives on the bind mount (no volume). `binaryTargets` includes `native`, `linux-arm64-openssl-3.0.x`, and `debian-openssl-3.0.x`, so one client works on the host (editor types) and in containers on Apple silicon or x86.
- SWC (`-b swc`) is dev-only and does not type-check; `nest build`/`tsc` remain the type-checked paths.
- Turbo is for `build`/`lint`/`typecheck`/`test`; wire `@repo/db#generate` before db/API build and typecheck. It is not the dev server.
- Lint/format with Biome (`biome.json`); package `lint` scripts run `biome check`. Do not add ESLint/Prettier.
- `.gitignore`: `.env*` except `.env.example`, `packages/db/generated`, `dist`, `.turbo`, `*.tsbuildinfo`.

## Commands

- Local dev runs in Docker Compose. Start the stack first, then run one-off commands in another terminal.
- Dependency changes: run `pnpm add`/`pnpm install` on the host (updates the lockfile), then restart `pnpm dev`; it rebuilds the images and renews the `node_modules` volumes.
- Schema changes: `pnpm db:generate && pnpm db:push` (the API restarts on regeneration). `db:push` targets the dev DB only; the test DB is pushed when the `db` container starts.

```bash
pnpm dev             # foreground: build + start mongo, db, api (renews node_modules volumes)
pnpm dev:down        # stop and remove containers

# While `pnpm dev` is running:
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm db:generate
pnpm db:push
pnpm db:studio       # http://localhost:5555
pnpm infra:dev       # Mongo only
pnpm infra:dev:down

docker compose exec api pnpm --filter @repo/api test:e2e
docker compose exec api pnpm --filter @repo/api exec vitest run <path>
docker compose exec db pnpm --filter @repo/db exec prisma <command>
```

## Frontend

- `apps/web` uses Mantine for UI, react-hook-form + `zodResolver` with `@repo/contract` schemas, Axios for HTTP, TanStack Query for server state, and TanStack Router for routing. Do not add another UI kit, `@mantine/form`, `react-router-dom`, or another data-fetching library.
- Wrap the app in `MantineProvider` and `QueryClientProvider` with one `QueryClient`; import Mantine's global styles in the entrypoint.
- All HTTP goes through one Axios instance in `src/lib/api.ts`, using `VITE_API_URL`; attach the current access token and on 401 clear auth state and redirect to `/signin`. Exempt signup/signin requests so their 401s reach the form.
- Use TanStack Query mutations for signup/signin and a query for `/auth/me`; clear the query cache on logout.
- TanStack Router owns routes; guard `/app` and redirect unauthenticated users to `/signin`; after signup/signin go to `/app`.

## Product requirements (exact)

- Routes: `/signup`, `/signin`, `/app`. Unauthenticated `/app` visits redirect to `/signin`.
- Signup fields: email (valid format), name (min 3 chars), password (min 8 chars, at least one letter, one number, and one special/non-alphanumeric character).
- Signin fields: email + password.
- Application page must display the exact text `Welcome to the application.` Logout is optional but should end the session and redirect.
- Define all email/name/password rules once in `@repo/contract`; React forms and Nest validation must use those schemas. Client-only validation is not acceptable.
- Nest 12 validation: register `StandardSchemaValidationPipe` as `APP_PIPE` and attach contract schemas with `@Body({ schema })`; do not add class-validator DTOs.
- Contract types: `SignUpInput`, `SignInInput`, `AuthResponse` (token + `User`), and public `User` (no `passwordHash`). They describe HTTP JSON, not Prisma rows (ISO date strings; no `Date`/`ObjectId`/Prisma types).
- API contract: `POST /auth/signup` (201) and `POST /auth/signin` (200) return `AuthResponse`; `GET /auth/me` (protected, 200/401) returns `User`. Use 400 for validation, 401 for bad credentials, 409 for duplicate email.
- Store a unique, normalized (lowercased) email and a password hash only. Map Prisma `User` records to the public `User` contract at the API boundary.

## Guardrails

- Hash passwords with bcrypt/argon2; issue short-lived JWTs; protect endpoints with a Nest guard.
- Enable Helmet, CORS restricted to `WEB_ORIGIN`, global validation/error handling, and env-based secrets.
- `@repo/db` exports a lazy, globalThis-cached Prisma client getter; `apps/api` calls it from one `PrismaService` after env loading. Do not create clients per request, and never import `@repo/db` from web or contract.
- MongoDB/Prisma: stay on Prisma 6.19.0 (Prisma 7 has no MongoDB connector); use `prisma db push`, not migrations. Put `url = env("MONGODB_URI")` in `schema.prisma`; do not copy the Prisma 7 `prisma.config.ts`/driver-adapter setup.
- Model IDs as `String @id @default(auto()) @map("_id") @db.ObjectId`.
- Compose injects `MONGODB_URI=mongodb://mongo:27017/assessment?replicaSet=rs0` and `MONGODB_TEST_URI=.../assessment_test?...` into `db`/`api`, plus `JWT_SECRET`, `JWT_EXPIRES_IN`, and `WEB_ORIGIN` into `api`. `.env.example` files document host-run values (`127.0.0.1` + `directConnection=true`); no host `.env` is needed for Docker dev. Never commit `.env`.
- API tests use the `assessment_test` database on the same Mongo container: both vitest configs override `MONGODB_URI` with `MONGODB_TEST_URI`. Do not add `mongodb-memory-server`. Tests that write data must clean up after themselves.
- Requirements first, then bonus work (logging, Swagger/OpenAPI, CI, more tests). Avoid extra services, GraphQL, Redux, and microservices for this scope.
