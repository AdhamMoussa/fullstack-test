# AGENTS.md

## Repo state

- Greenfield full-stack assessment defined by `Full_Stack_Test_Task.pdf` (auth module). If `apps/` is missing, scaffold it using the layout below.
- The PDF is a local, untracked file excluded via `.git/info/exclude`; it is marked Internal and must never be committed. It is the source of truth. If direct PDF reading is unavailable, extract it with:
  `gs -q -sDEVICE=txtwrite -o - Full_Stack_Test_Task.pdf`
- Submission is a public GitHub repo; keep `README.md` and `AI.md` at the root.

## Tooling

- Use the Context7 MCP for library/framework documentation before implementing APIs or configuration; prefer it over memory or web search.
- Feature plans live in `plans/<feature>/` with `plan.md` (current plan), `tasks.md` (checklist), and `changes.md` (append-only developer-requested refinements with the initial baseline). Keep task status current. Auth is `plans/auth/`.
- AI usage, corrections, and the developer’s human decisions are recorded in `AI.md`; read it before changing scope or tooling, and do not attribute AI-proposed defaults to the developer.

## Required deliverables

- React + TypeScript frontend: signup, signin, and a protected application page.
- NestJS + MongoDB API: signup, signin, and at least one protected endpoint.
- `README.md`: setup, env vars, scripts, how to run tests, and a short API overview.
- `AI.md` (mandatory per the spec): which code was AI-assisted, effective prompts/approaches, and what you corrected or reworked.

## Workspace

- Use pnpm workspaces + Turbo. Keep a single `pnpm-lock.yaml`; do not add npm or yarn lockfiles.
- Package names: `@repo/web`, `@repo/api`, `@repo/db`, `@repo/contract`. Import across packages by name, never by relative path.
- Target layout:
  - `apps/web` — Vite React app with Mantine, RHF/Zod, Axios, TanStack Query/Router; Dockerfile in `apps/web/Dockerfile`; container `web`; imports `@repo/contract` only
  - `apps/api` — NestJS 12 ESM app; Dockerfile in `apps/api/Dockerfile`; container `api`
  - `packages/db` — Prisma 6.19.0 schema, generated client, and singleton export; Dockerfile in `packages/db/Dockerfile`; container `db`
  - `packages/contract` — Zod schemas + inferred input/output types; Dockerfile in `packages/contract/Dockerfile`; container `contract`; browser-safe
  - `compose.yaml` — `mongo`, `db` (tsup watch), `contract` (tsup watch), `api` (nodemon), and `web` (Vite) containers
- Dependency direction: `web -> contract`; `api -> contract + db`; `db` and `contract` must not import each other.
- Shared packages are ESM (`"type": "module"`), built by tsup to `dist`, with `main`/`types`/`exports` pointing at `dist`; apps depend on them with `workspace:*`. Every shared package exposes `build`, `watch`, `lint` (`oxlint`), and `typecheck` (`tsc --noEmit`).
- `packages/contract`: `src/auth.ts` (email/password rules, `signUpInputSchema`, `signInInputSchema`, `forgotPasswordInputSchema`, `resetPasswordInputSchema` and their types) and `src/common.ts` (`userSchema`/`User`, `authResponseSchema`/`AuthResponse` as `{ user }` with no token, `apiErrorSchema`/`ApiError`), all exported from `src/index.ts`. Types via `z.infer`; tsup `platform: "neutral"`, `external: ["zod"]`; Vitest tests live beside the schemas.
- `packages/db`: Prisma schema in `prisma/`, generated client in `generated/prisma` (gitignored), globalThis-cached singleton, re-exported Prisma types; no Nest imports. Scripts `generate`/`push`/`studio` (root `db:*` aliases); tsup `platform: "node"`, externalize Prisma runtime.
- DB models: `User` (ObjectId `id`, unique normalized `email`, `name`, `passwordHash`, `emailVerified`, timestamps), `AuthSession` and `AuthEmailToken` for the `@nestjs/authentication` `SessionStore`/`EmailTokenStore` contracts. Auth uses server-side sessions, not JWT; do not add a custom `PasswordResetToken` or `RefreshToken` model.
- Shared versions (`typescript`, `@types/node`, `tsup`, `zod`) live in the `pnpm-workspace.yaml` catalog; packages use `"catalog:"`. Allow `prisma`, `@prisma/client`, `@prisma/engines`, `@swc/core`, and `esbuild` install scripts there; pnpm blocks them by default.
- Containers set `pnpm_config_verify_deps_before_run=false` (in `compose.yaml`, not the workspace file) so `docker compose exec` never auto-installs into the container's `node_modules`; the host keeps pnpm's default check.
- API is ESM (`"type": "module"`): use `.js` extensions in relative imports; do not add CommonJS settings.
- One class per file: put related classes in separate files under the feature folder (for example `src/auth/mailers/password-reset.mailer.ts`).
- Name methods and variables for intent, not generic placeholders: use `verifyPassword`, `storedCredentials`, and `passwordMatches`, not `verify`, `found`, and `valid`.
- Never use `useEffect` unless very necessary. Prefer derived render state, event handlers, and router primitives (`beforeLoad` + `redirect`, `<Navigate>` for non-auth cases); do not use effects for redirects or state derivation.
- Root scripts: `dev`, `dev:down`, `build`, `lint`, `typecheck`, `test`, `db:generate`, `db:push`, `db:studio`, `infra:dev`, `infra:dev:down`.
- Ports: web `5173`, API `3000`, Prisma Studio `5555`, MongoDB `27017`. Publish every port on `127.0.0.1` (Studio has no auth).
- Local dev runs as separate Compose services. `db` runs its `dev` script: `prisma generate` → `db push` to the dev and test DBs → `tsup --watch --onSuccess 'touch /tmp/db-ready'` (the healthcheck waits for that file). `contract` runs `tsup --watch`; `api` runs `nodemon` → `nest start` (SWC builder from `nest-cli.json`), watching `apps/api/src`, `packages/db/dist`, `packages/db/generated/prisma/index.js`, and `packages/contract/dist`; `web` runs Vite with HMR on port 5173. Package rebuilds and client regeneration restart the API.
- Every app/package has its own Dockerfile and Compose service. Dockerfiles use `pnpm fetch` (lockfile-only layer) → `COPY . .` → `CI=true pnpm install --offline --frozen-lockfile`; do not list per-package `package.json` files. `CI=true` is required or pnpm aborts (no TTY to confirm relinking the fetched store).
- Dev Dockerfiles must install `procps` and services use `init: true`: Nest CLI kills its app child via `tree-kill`, which shells out to `ps`. Without it, restarts orphan the old server and fail with `EADDRINUSE`.
- API nodemon ignores `packages/db/dist/*.d.ts`/`*.map` and `packages/contract/dist/*.d.ts`/`*.map` so one tsup rebuild triggers one restart, not two. No polling: bind-mount file events reach the containers.
- Source is bind-mounted at `/app`; every app/package `node_modules` is an anonymous volume per service, refreshed from the image by `pnpm dev` (`--renew-anon-volumes`). Do not switch them to named volumes; Docker only seeds named volumes once, so new dependencies would never appear. The `api` container also mounts `apps/web/node_modules` because root build/lint/typecheck run there.
- `packages/db/generated` lives on the bind mount (no volume). `binaryTargets` includes `native`, `linux-arm64-openssl-3.0.x`, and `debian-openssl-3.0.x`, so one client works on the host (editor types) and in containers on Apple silicon or x86.
- SWC is the builder configured in `apps/api/nest-cli.json` (with `typeCheck`); nodemon runs plain `nest start`, and `pnpm typecheck` remains the full workspace check.
- Turbo is for `build`/`lint`/`typecheck`/`test`; wire `@repo/db#generate` before db/API build and typecheck. It is not the dev server.
- Lint with Oxlint: root `.oxlintrc.json` for Node packages, `apps/api/.oxlintrc.json` for type-aware API rules, and `apps/web/.oxlintrc.json` for React. The API lint runs `oxlint --type-aware` and uses the root `oxlint-tsgolint` dev dependency. Format with Prettier using `.prettierrc`; run `pnpm format` or `pnpm format:check` from the host. Biome and ESLint are removed.
- `.gitignore`: `.env*` except `.env.example`, `packages/db/generated`, `dist`, `.turbo`, `*.tsbuildinfo`.

## Commands

- Local dev runs in Docker Compose. Start the stack first, then run one-off commands in another terminal.
- Dependency changes: run `pnpm add`/`pnpm install` on the host (updates the lockfile), then restart `pnpm dev`; it rebuilds the images and renews the `node_modules` volumes.
- Schema changes: `pnpm db:generate && pnpm db:push` (the API restarts on regeneration). `db:push` targets the dev DB only; the test DB is pushed when the `db` container starts.

```bash
pnpm dev             # foreground: build + start mongo, db, contract, api, web (renews node_modules volumes)
pnpm dev:down        # stop and remove containers

# While `pnpm dev` is running:
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm format
pnpm format:check
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

- The web foundation is in place: Mantine, one QueryClient, TanStack Router file-based routes, the credentialed Axios client, and auth query keys/helpers. Auth guards run in `beforeLoad` on the `_app` (signed-in only) and `_auth` (signed-out only) layout routes, and the router's `defaultPendingComponent` shows the loading view. The auth screens use `react-hook-form` + `zodResolver` with the `@repo/contract` schemas and the mutation hooks in `src/modules/auth/queries/auth-mutations.ts`; server errors map onto the form via `setError` (409 → `email`, others → `root.serverError`).
- Web code is split into modules. `src/modules/core` is shared code: `lib` (Axios and QueryClient), `layouts` (the `_app` layout), `components` (shared UI such as the loading screen), and `pages` (application page). `src/modules/auth` owns auth: `layouts`, `pages`, `queries`, and `lib` (API calls, route guards, `redirect` search schema, and `resetAuthState`). Route files in `src/routes` stay thin and import from modules. `src/routeTree.gen.ts` is generated; do not edit it by hand.
- `apps/web` uses Mantine for UI, react-hook-form + `zodResolver` with `@repo/contract` schemas, Axios for HTTP, TanStack Query for server state, and TanStack Router for routing. Do not add another UI kit, `@mantine/form`, `react-router-dom`, or another data-fetching library.
- Wrap the app in `MantineProvider` and `QueryClientProvider` with one `QueryClient`; import Mantine's global styles in the entrypoint.
- All HTTP goes through one Axios instance in `src/modules/core/lib/api.ts`, using `VITE_API_URL` with `withCredentials: true`; the session is an httpOnly cookie, so there is no bearer token or `localStorage`. On a 401 from a protected request, `router.tsx` (via `onUnauthorized`) calls `resetAuthState`, which clears the query cache and runs `router.invalidate()` so the guards redirect to `/signin`. Do not use `window.location`. Auth form requests (`/auth/signup`, `/auth/signin`, `/auth/forgot-password`, `/auth/reset-password`) are exempt so their errors reach the form.
- Use TanStack Query mutations for signup/signin/forgot/reset. The current user comes from `currentUserQueryOptions` (`['auth', 'current-user']`), which resolves to `User | null`: a 401 from `/users/me` means signed out, not an error. After sign-in, sign-up, reset, or sign-out succeeds, call `resetAuthState(queryClient, router)`. The re-run guards then do the navigation (the `_auth` guard sends signed-in users to `?redirect=` or `/app`), so forms don't navigate by hand.
- TanStack Router uses file-based routes under `src/routes`. Keep route files thin; put UI, hooks, and logic in `src/modules/auth` or `src/modules/core`. In-app links use `AnchorLink` (`src/modules/core/components/anchor-link.tsx`, `createLink` over Mantine `Anchor`) for Mantine styling and typed `to`; API error details are read with `getApiErrorStatus`/`getApiErrorMessage` from `src/modules/core/lib/api-error.ts`. The router context carries `queryClient`. Guards in `src/modules/auth/lib/route-guards.ts` call `queryClient.ensureQueryData(currentUserQueryOptions)` and `throw redirect(...)`. `_app` returns `{ currentUser }` as route context (read it with `getRouteApi('/_app').useRouteContext()`). `_auth` validates a same-origin `redirect` search param. Do not render `<Navigate>` for auth and do not write the current-user query cache with `setQueryData`. Forgot/reset live at `/forgot-password` and `/reset-password`.

## Product requirements (exact)

- Routes: `/signup`, `/signin`, `/forgot-password`, `/reset-password`, `/app`. Unauthenticated `/app` visits redirect to `/signin`.
- Signup fields: email (valid format), name (min 3 chars), password (min 8 chars, at least one letter, one number, and one special/non-alphanumeric character), and `confirmPassword` that must match `password`; the mismatch error belongs on `confirmPassword`.
- Signin fields: email + password.
- Application page must display the exact text `Welcome to the application.` Logout is optional but should end the session and redirect.
- Define all email/name/password rules once in `@repo/contract`; React forms and Nest validation must use those schemas. Client-only validation is not acceptable.
- Nest 12 validation: register `StandardSchemaValidationPipe` as `APP_PIPE` and attach contract schemas with `@Body({ schema })`; do not add class-validator DTOs.
- Contract types: `SignUpInput`, `SignInInput`, `ForgotPasswordInput`, `ResetPasswordInput`, `AuthResponse` (`{ user: User }`, no token), and public `User` (no `passwordHash`). They describe HTTP JSON, not Prisma rows (ISO date strings; no `Date`/`ObjectId`/Prisma types).
- API contract: `POST /auth/signup` (201) and `/auth/signin` (200) return the public user and set the httpOnly session cookie; `/auth/forgot-password` (202, generic, no body); `/auth/reset-password` (200, signs in, sets cookie; 400 invalid/expired/used token); `POST /auth/sign-out` (204, clears cookie); `GET /users/me` (protected, 200/401) returns `User`. Mark auth routes and the scaffold `GET /` `@Public()`. Use 400 for validation, 401 for bad credentials, 409 for duplicate email. Do not register `/auth/me`.
- Store a unique, normalized (lowercased) email and a password hash only. Map Prisma `User` records to the contract `User` at the API boundary.

## Guardrails

- Use `@nestjs/authentication`: its global guard (default deny), `PasswordHasher` (scrypt, no argon2), `SessionCookieProvider`, `SignInService`, and `PasswordResetService`. Mark auth routes and the scaffold `GET /` `@Public()`; do not build a custom JWT/guard/password-reset implementation.
- Split modules: `AuthModule` owns `/auth/*`, `UsersModule` owns `/users/*` and the protected `/users/me`; use the package's `@CurrentUser()`.
- Sessions: httpOnly cookie, SameSite=Lax, Secure by default (`SESSION_COOKIE_SECURE=true` → `__Host-sid`); dev Compose sets it `false` → `sid`, because Safari drops Secure cookies on `http://localhost`. Configure lifetimes and `trustedOrigins: [WEB_ORIGIN]`. The name comes from `sessionCookieName()` in `apps/api/src/config/session-cookie.ts`. No token in localStorage or the response.
- Implement `SessionStore`/`EmailTokenStore` against Prisma/Mongo and run `authenticationStoreContract()`; password reset stays package-owned. Always return 202 from forgot-password regardless of whether the email exists; never return raw tokens in HTTP. The dev mailer (`LogMailTransport`) logs the reset link; production email delivery is a follow-up.
- Enable Helmet, credentialed CORS for `WEB_ORIGIN`, package CSRF origin checks (`app.enableCsrfProtection()` on Nest 12.1+), global validation/error handling, and env-based secrets.
- `@repo/db` exports a lazy, globalThis-cached Prisma client getter; `apps/api` calls it from one `PrismaService` after env loading. Do not create clients per request, and never import `@repo/db` from web or contract.
- MongoDB/Prisma: stay on Prisma 6.19.0 (Prisma 7 has no MongoDB connector); use `prisma db push`, not migrations. Put `url = env("MONGODB_URI")` in `schema.prisma`; do not copy the Prisma 7 `prisma.config.ts`/driver-adapter setup.
- Model IDs as `String @id @default(auto()) @map("_id") @db.ObjectId`.
- Compose injects `MONGODB_URI=mongodb://mongo:27017/assessment?replicaSet=rs0` and `MONGODB_TEST_URI=.../assessment_test?...` into `db`/`api`, plus `WEB_ORIGIN`, `APP_URL`, `MAIL_FROM`, `SESSION_ABSOLUTE_TTL`, `SESSION_IDLE_TTL`, `SESSION_COOKIE_SECURE` (defaults to `false` in dev), and optional `SMTP_URL` into `api`. JWT env is removed. `.env.example` files document host-run values (`127.0.0.1` + `directConnection=true`); no host `.env` is needed for Docker dev. Never commit `.env`.
- API tests use the `assessment_test` database on the same Mongo container: both vitest configs override `MONGODB_URI` with `MONGODB_TEST_URI`. Use a cookie-preserving Supertest agent and run the authentication store contract. Do not add `mongodb-memory-server`. Tests that write data must clean up after themselves.
- The auth e2e suite overrides `AUTHENTICATION_MODULE_OPTIONS` with `session.cookie.secure=false` because Supertest's HTTP cookie jar drops Secure cookies; production keeps the package's `__Host-sid` default. It uses `InMemoryMailTransport` and a cheap `PasswordHasher`, and e2e files run serially so the store contract's collection cleanup cannot race it.
- API docs use `@nestjs/swagger` at `/docs` (`/docs/json`), set up in `apps/api/src/openapi/setup-openapi.ts` and skipped when `NODE_ENV=production`. Request bodies come from `@Body({ schema })` and responses from `standardSchema: <contract schema>`. Component names are registered API-side in `openapi-schema-ids.ts` (never `.meta({ id })` in `@repo/contract`, since HMR would re-register them). No DTO classes and no class-validator.
- Logging uses Nest's built-in JSON `ConsoleLogger` (`flattenParams`), not pino or winston. The request-log middleware (`apps/api/src/logging/request-logging.middleware.ts`) is registered first in `main.ts` so CSRF rejections are logged too; auth audit lines come from `AuthenticationEvents` in `apps/api/src/auth/auth-audit.logger.ts`. Never log bodies, cookies, tokens, query strings, or emails. Do not add pino/winston or nestjs-pino.
- Requirements first, then bonus work (CI, more tests). Avoid extra services, GraphQL, Redux, and microservices for this scope.
