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
  - `apps/api` — NestJS 12 ESM app; owns HTTP/auth and is the only consumer of `@repo/db`
  - `packages/db` — Prisma 6.19.0 schema, generated client, and singleton export; server-only
  - `packages/contract` — Zod schemas + inferred input/output types; browser-safe
  - `compose.yaml` — MongoDB service named `mongo` on `127.0.0.1:27017`
- Dependency direction: `web -> contract`; `api -> contract + db`; `db` and `contract` must not import each other.
- Shared packages are ESM (`"type": "module"`), built by tsup to `dist`, with `main`/`types`/`exports` pointing at `dist`; apps depend on them with `workspace:*`. Every shared package exposes `build`, `watch`, `lint` (`biome check`), and `typecheck` (`tsc --noEmit`).
- `packages/contract`: one Zod schema per input/output, types via `z.infer`, all exported from `src/index.ts`; tsup `platform: "neutral"`, `external: ["zod"]`.
- `packages/db`: Prisma schema in `prisma/`, generated client in `generated/prisma` (gitignored), globalThis-cached singleton, re-exported Prisma types; no Nest imports. Scripts `generate`/`push`/`studio` (root `db:*` aliases); tsup `platform: "node"`, externalize Prisma runtime.
- Shared versions (`typescript`, `@types/node`, `tsup`, `zod`) live in the `pnpm-workspace.yaml` catalog; packages use `"catalog:"`. Allow `prisma`, `@prisma/engines`, and `esbuild` install scripts there; pnpm blocks them by default.
- API is ESM (`"type": "module"`): use `.js` extensions in relative imports; do not add CommonJS settings.
- Target root scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `db:generate`, `db:push`, `db:studio`, `infra:dev`, `infra:dev:down`.
- Ports: web `5173`, API `3000`, MongoDB `27017`.
- Turbo: `dev` = `turbo watch dev`, `persistent: true`, `cache: false`, `dependsOn: ["^build"]`; packages expose `watch` (tsup --watch), not `dev`; wire `@repo/db#generate` before db/API build and typecheck.
- Turbo owns dev rebuilds/restarts; do not run package watchers or a second Nest watcher alongside `pnpm dev`.
- Lint/format with Biome (`biome.json`); package `lint` scripts run `biome check`. Do not add ESLint/Prettier.
- `.gitignore`: `.env*` except `.env.example`, `packages/db/generated`, `dist`, `.turbo`, `*.tsbuildinfo`.

## Commands

- If `apps/`/`packages/` are missing, only the generic Turbo scripts work; `db:*`, `infra:*`, and env-copy commands require the scaffold below.

```bash
pnpm install
cp packages/db/.env.example packages/db/.env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm infra:dev       # start MongoDB via Docker Compose
pnpm infra:dev:down  # stop it
pnpm dev             # turbo watch: builds shared packages, runs web + api
pnpm db:generate     # after Prisma schema changes
pnpm db:push         # sync MongoDB schema; no migrations
pnpm db:generate && pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm --filter @repo/api <script>
pnpm --filter @repo/api exec vitest run <path>
pnpm --filter @repo/web exec vitest run <path>
pnpm --filter @repo/db exec prisma <command>
pnpm --parallel --filter @repo/contract --filter @repo/db watch  # not alongside pnpm dev
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
- Env examples: `packages/db/.env.example` and `apps/api/.env.example` both need `MONGODB_URI`; API also needs `JWT_SECRET`, `JWT_EXPIRES_IN`, `WEB_ORIGIN`; web needs `VITE_API_URL`. Never commit `.env`.
- API tests must not use the dev database; use `mongodb-memory-server` or a dedicated test database.
- Requirements first, then bonus work (logging, Swagger/OpenAPI, CI, more tests). Avoid extra services, GraphQL, Redux, and microservices for this scope.
