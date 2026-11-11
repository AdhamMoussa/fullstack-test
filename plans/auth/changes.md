# Auth Plan Changes

This file is the append-only history of developer-requested refinements to the
auth plan. [`plan.md`](./plan.md) is the current plan; this file records what the
initial plan was and what changed after it was written.

Implementation progress belongs in [`tasks.md`](./tasks.md). A product/scope change
belongs here and should also be reflected in `plan.md`.

## Initial plan baseline — 2026-11-11

The initial plan was recorded on 2026-11-11 with these decisions:

- Contract-first validation: `@repo/contract` is the single source of request
  schemas and wire types; the API uses `@Body({ schema })` and the web uses
  `zodResolver`.
- Signup fields: email, name, password, and matching `confirmPassword`;
  `confirmPassword` is validation-only.
- Bearer JWT access tokens returned by signup/signin; the web stores the token in
  `localStorage` for this scope. No refresh tokens, sessions, or cookie auth.
- Argon2id password hashing; no `passwordHash` in responses.
- Unique, normalized email; duplicate email is 409; bad credentials are generic 401s.
- `GET /auth/me` is protected and returns `PublicUser`.
- Frontend: Mantine, react-hook-form + Zod, Axios, TanStack Query, and code-based
  TanStack Router routes.
- API e2e tests use the `assessment_test` database.
- Groundwork at plan creation: contract (including password confirmation), Prisma
  `User`, API schema pipe, Docker services, Oxlint, and the Vite scaffold were in
  place; auth implementation had not started.

## Change log

### 2026-11-11 — Password confirmation on signup

- **Requested by:** Developer
- **Request:** “signup should have password confirmation”
- **Change:** Added `confirmPassword` to `signUpInputSchema`, required it to match
  `password`, attached the mismatch error to `confirmPassword`, and added tests for
  mismatch/missing confirmation. The plan and signup task now include the field.
- **Why:** Prevent mistyped passwords at signup and keep the rule shared by API and
  web.
- **Impact:** `SignUpInput` includes `confirmPassword`; the API must validate and
  discard it, and the signup form needs the extra field.
- **Files:** `packages/contract/src/auth.ts`, `auth.spec.ts`, `plan.md`, `tasks.md`.
- **Status:** contract implemented (11 tests passing); API/form work pending.
- **Note:** This was requested before the written plan existed, so it is folded into
  the initial baseline as well as recorded here for history.

### 2026-11-11 — Add forgot-password and reset-password

- **Requested by:** Developer
- **Request:** “add forgot-password and reset-password functionality”
- **Change:** Added the two auth flows to scope: `POST /auth/forgot-password`
  (generic 202), `POST /auth/reset-password` (204), a hashed single-use
  `PasswordResetToken` model with a 15-minute expiry, a dev mailer that logs the
  reset link, forgot/reset contract schemas and tests, and web pages/routes for
  `/forgot-password` and `/reset-password`.
- **Why:** Users need a way to recover access without support intervention.
- **Impact:** New DB model, synced with `db push`; new contract inputs; extra API
  endpoints and e2e tests; extra web routes/forms. Production email delivery is
  still out of scope; the dev mailer logs the link and tokens are never returned in
  HTTP responses.
- **Files:** `plan.md`, `tasks.md`, `packages/contract`, `packages/db/prisma`,
  `apps/api`, `apps/web`, `README.md`, `AGENTS.md`.
- **Status:** planned; implementation not started.

### 2026-11-11 — Move user info to users module at `/users/me`

- **Requested by:** Developer
- **Request:** “user info endpoint should be `/me` not `/auth/me`”, followed by “use
  a ‘users’ module for user related endpoints. user info endpoint should be
  `/users/me`”.
- **Change:** Final path is `GET /users/me`; the endpoint moves out of the auth
  controller into `UsersModule`. `AuthModule` exports the guard used by the users
  controller, and tests/docs move from `/auth/me` to `/users/me`. The intermediate
  `/me` suggestion is superseded by `/users/me`.
- **Why:** Keep auth flows (`/auth/*`) separate from user data (`/users/*`) and give
  user endpoints a stable home.
- **Impact:** New users controller/service/module; auth no longer owns user info;
  API table, e2e tests, frontend query, and tasks updated. `/auth/me` must not be
  registered.
- **Files:** `plan.md`, `tasks.md`, `AGENTS.md`, `README.md`.
- **Status:** planned; implementation not started.

### 2026-11-11 — Adopt `@nestjs/authentication` with httpOnly sessions

- **Requested by:** Developer
- **Request:** “ok let's adopt it” after evaluating `@nestjs/authentication`, with
  “update plans only. no implementation yet” and “plans and docs. no code
  implementation”.
- **Change:** Replaced the planned JWT/localStorage, argon2, custom guard, and custom
  password-reset-token design with `@nestjs/authentication`:
  - httpOnly `__Host-sid` session cookie (SameSite=Lax, Secure in production);
  - global guard with `@Public()` auth routes and the scaffold `GET /`;
  - `PasswordHasher` (scrypt) instead of argon2;
  - package `PasswordResetService` and `EmailTokenStore` instead of a custom
    `PasswordResetToken` model;
  - Prisma `SessionStore`/`EmailTokenStore` implementations;
  - `POST /auth/sign-out`, credentialed CORS, and package CSRF origin checks;
  - reset-password signs the user in and returns to `/app`;
  - Auth response no longer carries an access token.
- **Why:** Use the framework's security-sensitive auth implementation instead of
  hand-written code, avoid the native argon2 dependency, and get a tested session
  and reset flow.
- **Impact:** Plan/tasks/AGENTS/README/AI changed only. `User` gains
  `emailVerified`; add `AuthSession` and `AuthEmailToken`; no JWT env, localStorage,
  or `PasswordResetToken`. Implementation is still pending.
- **Files:** `plan.md`, `tasks.md`, `AGENTS.md`, `README.md`, `AI.md`.
- **Status:** planned; no code implementation.

### 2026-11-11 — File-based routing and modular web structure

- **Requested by:** Developer
- **Request:** “use Tanstack router file based routing”, “use layouts for auth
  checks”, “stop complicating things”, “use modular structure on React project. an
  auth module and core module. each module has its own components, hooks, libs...
  the core module is for shared stuff”.
- **Change:** Replaced the manual code-based route tree with TanStack Router
  file-based routes under `src/routes`. Added `_auth` and `_app` layout routes for
  auth checks. Split web code into `src/modules/core` (shared API/query client/layouts)
  and `src/modules/auth` (components, hooks, libs). Simplified landing and fallback
  handling by redirecting to `/app` and letting the layouts decide.
- **Why:** Keep route definitions small and conventional, centralize auth checks in
  layouts, and give the React app clear module boundaries.
- **Impact:** `@tanstack/router-plugin` and `@tanstack/router-cli` added; the Vite
  plugin generates `src/routeTree.gen.ts`. `apps/web` source moved into `modules`.
  No API or product behavior changes.
- **Files:** `apps/web`, `AGENTS.md`, `README.md`, `AI.md`, `plan.md`, `tasks.md`.
- **Status:** implemented; screens still pending.

### 2026-11-11 — Root-layout auth gate without beforeLoad or cache writes

- **Requested by:** Developer
- **Request:** “avoid using beforeLoad for auth check. just use query hook at root
  layout with a loading view, redirect according to query results.” and “avoid
  manually setting query cache”.
- **Change:** Removed auth checks from route `beforeLoad` hooks. The root layout now
  runs the `/users/me` query, shows a loading view while it settles, and redirects
  based on the result. `_auth`/`_app` are presentational layouts. Removed the
  `setCurrentUser`/manual `setQueryData` path. The root query suppresses the global
  401 redirect so auth pages can render while signed out.
- **Why:** Keep one auth-state source and one redirect decision in the root layout,
  and let TanStack Query own the cache.
- **Impact:** Web-only; no API or product behavior changes.
- **Files:** `apps/web`, `AGENTS.md`, `README.md`, `AI.md`, `plan.md`, `tasks.md`.
- **Status:** implemented.

### 2026-11-11 — Use TanStack Router Navigate, not useEffect

- **Requested by:** Developer
- **Request:** “use the Tanstack router <Navigate> instead of useEffect. never use
  useEffect unless very necessary”.
- **Change:** The root layout renders `<Navigate>` for auth redirects and keeps
  `useEffect` out of the redirect path. The no-`useEffect` rule is recorded for
  future React work.
- **Why:** Keep redirects declarative and avoid effect-driven navigation.
- **Impact:** Web-only; no API or product behavior changes.
- **Files:** `apps/web`, `AGENTS.md`, `AI.md`, `plan.md`, `tasks.md`.
- **Status:** implemented.

### 2026-11-11 — Public User contract and final web module folders

- **Requested by:** Developer
- **Request:** “I made some changes. check them to see how the frontend should be
  structured. update docs accordingly and fix errors”.
- **Change:** Renamed the public contract type `PublicUser` to `User` and updated API
  imports to match. Settled the web module layout: `modules/auth` has `layouts`,
  `pages`, `queries`, and `lib`; `modules/core` has `layouts`, `pages`, `components`,
  and `lib`. The application page lives in `core/pages`; the auth root gate lives in
  `core/layouts`; route files remain thin.
- **Why:** Use one public user type and make the module boundaries explicit.
- **Impact:** API type imports, web imports, docs, and plans updated. No API behavior
  changes.
- **Files:** `packages/contract`, `apps/api`, `apps/web`, `AGENTS.md`, `README.md`,
  `AI.md`, `plan.md`, `tasks.md`.
- **Status:** implemented.

### 2026-11-11 — beforeLoad route guards (reverses the root-layout gate)

- **Requested by:** Developer
- **Request:** “fix the auth check and redirects on frontend. use proper pattern
  according to community standards and best practices”. When asked, the developer
  chose `beforeLoad` + `redirect` over keeping the no-`beforeLoad` rule.
- **Change:** Replaced the root-layout query gate with TanStack Router’s documented
  pattern: `_app`/`_auth` `beforeLoad` guards using
  `queryClient.ensureQueryData(currentUserQueryOptions)` and `throw redirect()`, a
  validated same-origin `?redirect=` return path, `{ currentUser }` route context,
  and the router `defaultPendingComponent`. `/users/me` now resolves to
  `User | null` (401 = signed out). The Axios 401 handler no longer sets
  `window.location`; it calls `resetAuthState` (clear cache + `router.invalidate()`).
  Query key is `['auth', 'current-user']`. Removed `core/layouts/root-layout.tsx`.
- **Why:** The old gate never redirected, and the global 401 handler reloaded
  `/signin` in a loop for signed-out users.
- **Impact:** Web-only; no API changes. Sign-in/up/reset/sign-out screens should
  call `resetAuthState` on success and let the guards navigate.
- **Files:** `apps/web`, `AGENTS.md`, `README.md`, `apps/web/README.md`, `AI.md`,
  `plan.md`, `tasks.md`.
- **Status:** implemented.

### 2026-11-11 — Swagger/OpenAPI docs

- **Requested by:** Developer
- **Request:** “implement API docs using Nestjs Swagger”
- **Change:** Added `@nestjs/swagger` with Swagger UI at `/docs` and the OpenAPI
  JSON at `/docs/json`, served when `NODE_ENV` is not `production`. Request bodies
  come from the existing `@Body({ schema })` contract schemas; responses use
  `standardSchema` decorators with `userSchema`, `authResponseSchema`, and
  `apiErrorSchema`. The schemas get OpenAPI component ids API-side in
  `apps/api/src/openapi/openapi-schema-ids.ts`, and the document declares a cookie
  security scheme for `__Host-sid`. Added response decorators to the auth, users,
  and app controllers and `test/openapi.e2e-spec.ts`.
- **Why:** Browsable, contract-accurate API docs without DTO classes that duplicate
  the shared schemas.
- **Impact:** New dependency `@nestjs/swagger`; new `NODE_ENV` env var; docs routes
  (disabled in production); new e2e spec. No API behavior changes.
- **Files:** `apps/api/package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
  `apps/api/.env.example`, `apps/api/src/config/env.validation.ts`,
  `apps/api/src/main.ts`, `apps/api/src/openapi/*`,
  `apps/api/src/{auth,users}/**`, `apps/api/src/app.controller.ts`,
  `apps/api/test/openapi.e2e-spec.ts`, `README.md`, `AGENTS.md`, `AI.md`,
  `plans/auth/{plan,tasks}.md`.
- **Status:** implemented.

### 2026-11-11 — Structured request logging

- **Requested by:** Developer
- **Request:** “add structured request logging”.
- **Change:** Added structured JSON logging without a new dependency: `main.ts`
  creates the app with Nest's built-in `ConsoleLogger` (`json`, `flattenParams`); a
  request middleware registered before the security-header/CSRF hooks logs one `HTTP`
  line per request (with a validated or generated `X-Request-Id` echoed back); and
  `AuthAuditLogger` subscribes to the package's `AuthenticationEvents` and logs
  only allowlisted fields.
- **Why:** Give every request and auth action a structured, correlatable log line
  without adding pino/winston, and log only fields that are safe to retain.
- **Impact:** JSON log lines on stdout instead of Nest's text format, a new
  `X-Request-Id` response header, new API unit tests for the middleware and the audit
  logger, and no new dependency or endpoint behavior change. Bodies, cookies, tokens,
  query strings, and emails stay out of the logs.
- **Files:** `apps/api/src/main.ts`,
  `apps/api/src/logging/request-logging.middleware.ts` (+ spec),
  `apps/api/src/auth/auth-audit.logger.ts` (+ spec),
  `apps/api/src/auth/auth.module.ts`, `README.md`, `AGENTS.md`, `AI.md`,
  `plans/auth/{plan,tasks,changes}.md`.
- **Status:** implemented.

### 2026-11-11 — Safari session cookie in local dev

- **Requested by:** Developer
- **Request:** A fresh-clone smoke test showed that signing up in Safari created the
  account, but the following `GET /users/me` returned 401 `missing_credentials`, so
  the user never signed in; then “fix it”.
- **Change:** Added an explicit `SESSION_COOKIE_SECURE` env flag (parsed as
  `'true'`/`'false'`, default `true`). The API now passes
  `cookieName: sessionCookieName(secure)` and `cookie: { secure }` to
  `@nestjs/authentication`, where `sessionCookieName()` lives in
  `apps/api/src/config/session-cookie.ts` and returns `__Host-sid` or `sid`. The
  OpenAPI document and its static descriptions use the same helper. Dev Compose sets
  `SESSION_COOKIE_SECURE=false`, and the API `.env.example` documents it. Added unit
  tests for the env parsing and the cookie-name helper.
- **Why:** Safari drops `Secure` cookies over plain HTTP, including
  `http://localhost`, while Chrome and Firefox accept them there. The package's
  default `__Host-sid` cookie is therefore silently discarded in Safari dev.
- **Impact:** New `SESSION_COOKIE_SECURE` env var (default `true`, Dev Compose
  `false`); local dev uses the `sid` cookie without `Secure`; production behavior is
  unchanged. New API unit tests; the OpenAPI e2e suite pins the secure default.
- **Files:** `apps/api/src/config/env.validation.ts` (+ spec),
  `apps/api/src/config/session-cookie.ts` (+ spec), `apps/api/src/app.module.ts`,
  `apps/api/src/openapi/{setup-openapi,api-responses,openapi-schema-ids}.ts`,
  `apps/api/vitest.config.e2e.ts`, `apps/api/.env.example`, `compose.yaml`,
  `README.md`, `AGENTS.md`, `AI.md`, `plans/auth/{plan,changes}.md`.
- **Status:** implemented.

### 2026-11-11 — Production configuration guards and deployment notes

- **Requested by:** Developer
- **Request:** proceeding with the submission-review tasks.
- **Change:** `SMTP_URL` is now required when `NODE_ENV=production` (env validation
  fails at startup instead of logging reset links); `VITE_API_URL` is required for
  web builds (Vite fails without it, and the Axios client has no localhost fallback);
  the README gains a Deploying section, and `AI.md` gains a "Prompts that worked"
  section.
- **Why:** A production deploy without SMTP would write every reset token to the
  logs, and a production build without `VITE_API_URL` would silently call localhost;
  both are silent misconfigurations instead of loud failures.
- **Impact:** The API refuses to start in production without `SMTP_URL`;
  `vite build` and `vite` fail without `VITE_API_URL`, so `compose.yaml` now sets it
  on the `api` service too (root builds run there). No API or product behavior
  changes; new API unit tests.
- **Files:** `apps/api/src/config/env.validation.ts` (+ spec), `apps/web/vite.config.ts`,
  `apps/web/src/modules/core/lib/api.ts`, `apps/web/src/vite-env.d.ts`, `compose.yaml`,
  `README.md`, `AI.md`, `AGENTS.md`, `plans/auth/changes.md`.
- **Status:** implemented.

### 2026-11-11 — GitHub Actions CI

- **Requested by:** Developer
- **Request:** "go ahead" (proceeding with the submission-review tasks).
- **Change:** Added `.github/workflows/ci.yml` for pushes to `main`, pull requests,
  and manual runs. It runs the Prettier format check, lint, typecheck, build, unit
  tests, and the API e2e suite, starting only the `mongo` service from `compose.yaml`
  and using `127.0.0.1` + `directConnection=true` URIs. `README.md` gains a CI badge
  and a note in the Tests section.
- **Why:** CI/CD is a scored bonus item, and it catches regressions on push.
- **Impact:** New workflow and README badge; no app or product changes.
- **Files:** `.github/workflows/ci.yml`, `README.md`, `AGENTS.md`, `AI.md`,
  `plans/auth/changes.md`.
- **Status:** implemented (pending first run).

### 2026-11-11 — CI MongoDB startup

- **Requested by:** Developer
- **Request:** The developer shared the failing "Start MongoDB" log from the first CI
  run ("container fullstack-test-mongo-1 is unhealthy").
- **Change:** CI starts Mongo with `docker run` plus an explicit replica-set
  readiness loop instead of the dev Compose healthcheck, prints the container logs
  on failure, and bumps `actions/checkout`, `actions/setup-node`, and
  `pnpm/action-setup` to their node24 majors (`v7`, `v7`, `v6`).
- **Why:** The runner marked the Compose healthcheck unhealthy within about 8 s,
  which is far sooner than the dev `start_period`/retries allow; decoupling CI from
  the dev healthcheck makes the job deterministic.
- **Impact:** CI only. No app, contract, or product changes.
- **Files:** `.github/workflows/ci.yml`, `AGENTS.md`, `AI.md`, `plans/auth/changes.md`.
- **Status:** implemented.

### 2026-11-11 — CI runner pinned to Ubuntu 24.04

- **Requested by:** Developer
- **Request:** The developer shared the CI log showing MongoDB refusing to start:
  "MongoDB cannot start: Linux kernel versions 6.19 and newer has a known
  incompatibility with this version of MongoDB. See
  https://jira.mongodb.org/browse/SERVER-121912". `ubuntu-latest` had moved to the
  Ubuntu 26 image with a newer kernel, and related tickets show newer MongoDB
  releases also fail on Ubuntu 26.04, so pin the runner instead of the Mongo
  version.
- **Change:** `.github/workflows/ci.yml` now uses `runs-on: ubuntu-24.04`, with a
  comment above it linking SERVER-121912. Nothing else in the workflow changed.
  `AGENTS.md` records the pin and the reason in its CI bullet.
- **Why:** `ubuntu-latest` now runs a kernel that MongoDB 8.x cannot start on; the
  earlier "unhealthy" Compose failure had the same root cause.
- **Impact:** CI only; local dev is unaffected unless the Docker VM kernel reaches
  6.19.
- **Files:** `.github/workflows/ci.yml`, `AGENTS.md`, `plans/auth/changes.md`.
- **Status:** implemented.

### 2026-11-11 — MongoDB 7.0 for dev and CI

- **Requested by:** Developer
- **Request:** The CI log still showed "MongoDB did not become a writable primary
  within 60 s" after the `ubuntu-24.04` pin. GitHub's `ubuntu-latest` and
  `ubuntu-24.04` runners are now both on Linux kernel 6.19+, so the pin did not
  help; the developer chose "7.0 for dev and CI".
- **Change:** `compose.yaml` and `.github/workflows/ci.yml` now use `mongo:7.0`.
  The runner pin is reverted to `runs-on: ubuntu-latest` and its comment is
  removed. `README.md` (services table, Deploying notes, Troubleshooting) and the
  `AGENTS.md` CI bullet describe 7.0 and the reason.
- **Why:** MongoDB 8.x's TCMalloc crashes on kernel 6.19+ (SERVER-121912). GitHub's
  24.04 runners have that kernel too, so pinning the runner didn't help. Reviewers
  on recent Linux kernels would hit the same crash in `pnpm dev`.
- **Impact:** The local Mongo volume created by 8.0 must be recreated
  (`docker compose down -v`; dev data is throwaway). No app code changes; Prisma 6
  supports MongoDB 7.0. This entry supersedes "CI runner pinned to Ubuntu 24.04"
  above; that entry stays as written.
- **Files:** `compose.yaml`, `.github/workflows/ci.yml`, `README.md`, `AGENTS.md`,
  `plans/auth/changes.md`.
- **Status:** implemented.

### 2026-11-11 — Turbo task graph builds shared packages first

- **Requested by:** Developer
- **Request:** CI follow-up (the developer is driving the CI fixes). The clean
  checkout failed `pnpm typecheck:inner` with "Cannot find module `@repo/contract`"
  and "`@repo/db` or its corresponding type declarations", and type-aware lint
  reported `User`/`Prisma.InputJsonValue` as `error` types.
- **Change:** The root `turbo.json` now makes `lint`, `typecheck`, and `test` depend
  on `^build` instead of `^lint`/`^typecheck`/`^test`; `packages/db/turbo.json` keeps
  `build` as `["generate", "^build"]` and changes `typecheck` from
  `["generate", "^typecheck"]` to `["generate", "^build"]`. `build` stays
  `["^build"]` with `outputs: ["dist/**"]`, and `generate` stays uncached.
- **Why:** The shared packages (`@repo/contract`, `@repo/db`) point `main`/`types`/
  `exports` at `dist`, which tsup produces. On a clean checkout nothing built those
  packages before lint/typecheck/test, so module resolution and typed lint failed.
  The dev watchers (`tsup --watch`) kept `dist` present locally and hid the bug.
- **Impact:** Root `pnpm typecheck`/`lint`/`test` now also build the shared packages
  first, usually as Turbo cache hits. `@repo/api#typecheck` reaches
  `@repo/db#build` → `@repo/db#generate` through `^build`, so the Prisma client is
  still generated. No app, contract, or product changes.
- **Files:** `turbo.json`, `packages/db/turbo.json`, `AGENTS.md`,
  `plans/auth/changes.md`.
- **Status:** implemented.

### 2026-11-11 — Submission-review polish

- **Requested by:** Developer
- **Request:** "implement the polish group"
- **Change:** Closed the remaining submission-review items:
  - contract max lengths (email ≤ 254, name ≤ 100, password ≤ 128) with messages and
    tests;
  - replaced the scaffold `GET /`/`AppService` with a public `GET /health` that pings
    MongoDB (200 `{ "status": "ok" }`, 503 on failure) and removed the scaffold tests;
  - `defaultErrorComponent` (`ErrorScreen`) on the router for API outages and 5xx
    responses;
  - `aria-invalid` on the password fields when they show an error;
  - TanStack Router `autoCodeSplitting`, which splits the web build into 15 chunks
    (434 kB main) instead of one 604 kB chunk;
  - the first web tests (Vitest + Testing Library + jsdom, 14 tests in 4 files) with a
    router harness.
- **Why:** Close the remaining review items: input bounds, production polish, and the
  first frontend tests for the testing bonus.
- **Impact:** New web dev dependencies (`vitest`, `jsdom`, `@testing-library/react`,
  `@testing-library/user-event`, `@testing-library/dom`) and web test scripts;
  `pnpm test` now includes the web app (25 contract + 23 API + 14 web = 62);
  the scaffold endpoint and `AppService` are gone.
- **Files:** `packages/contract/src/auth.ts` (+ spec), `apps/api/src/health/*`,
  `apps/api/src/app.module.ts`, `apps/api/src/{app.controller,app.service}*`
  (removed), `apps/api/test/{app,health,openapi}.e2e-spec.ts`,
  `apps/web/vite.config.ts`, `apps/web/vitest.config.ts`, `apps/web/package.json`,
  `apps/web/tsconfig.node.json`, `apps/web/src/router.tsx`,
  `apps/web/src/modules/core/components/error-screen.tsx`,
  `apps/web/src/modules/auth/pages/{signup,reset-password}.tsx`,
  `apps/web/src/modules/**/*.test.{ts,tsx}`, `apps/web/src/test/*`,
  `README.md`, `AGENTS.md`, `AI.md`, `plans/auth/{plan,tasks,changes}.md`.
- **Status:** implemented.

### 2026-11-11 — Link-based email verification

- **Requested by:** Developer
- **Request:** “is it easy to add email verification with OTP?”, then “ok implement
  the link-based flow with banner”.
- **Change:** Added link-based email verification on top of the package's
  `EmailVerificationService`: signup sends a 24-hour single-use link without blocking
  the response; public `POST /auth/verify-email` consumes the token; protected
  `POST /users/me/email-verification` resends it. The web app gains a top-level
  `/verify-email` page that POSTs on an explicit click and a non-blocking banner on
  `/app` with "Send a new link". Contract schema, API e2e, web tests, and docs were
  updated.
- **Why:** OTP codes are not what the package provides: it issues hashed single-use
  link tokens, while 6-digit codes would need custom storage and attempt limiting.
  Link-based verification reuses the tested package flow, and the banner keeps
  verification non-blocking for the assessment scope.
- **Impact:** New contract input and endpoints, a new top-level route outside the auth
  guards, a banner for unverified users, extra API e2e and web tests, and docs. No new
  DB model; verification tokens use the existing `auth_email_tokens` store.
- **Files:** `packages/contract/src/{auth,spec}.ts`,
  `apps/api/src/{auth,users}/**`, `apps/api/src/app.module.ts`,
  `apps/api/test/{auth,openapi}.e2e-spec.ts`, `apps/web/src/routes/verify-email.tsx`,
  `apps/web/src/modules/auth/**`, `apps/web/src/modules/core/pages/application-page.tsx`,
  `apps/web/src/test/render-with-router.tsx`, `README.md`, `AGENTS.md`, `AI.md`,
  `plans/auth/{plan,tasks,changes}.md`.
- **Status:** implemented.

### 2026-11-11 — Production Docker setup

- **Requested by:** Developer
- **Request:** "where's the production Docker setup?", then chose "Images + prod
  compose + CI".
- **Change:** Added production images for both apps and a local production-like
  stack:
  - `apps/api/Dockerfile.prod`: multi-stage; Turbo builds the API, then
    `pnpm --filter @repo/api --prod deploy --legacy` produces a `node:26-bookworm-slim`
    runtime that runs as the non-root `node` user from `dist/main.js`, with a
    Docker healthcheck on `/health`. Its `build` stage is reused for the schema push.
  - `apps/web/Dockerfile.prod`: Vite build with `VITE_API_URL` as a build arg, served
    by `nginxinc/nginx-unprivileged` on 8080 from `apps/web/nginx.conf` (SPA
    fallback, immutable `/assets` caching, gzip, security headers, `/` healthcheck).
  - `compose.prod.yaml` (project `assessment-prod`): mongo 7.0 replica set, Mailpit
    SMTP inbox, a one-off `schema` push, the API on 3001, the web app on 8080.
  - A `Production images` CI job that builds the stack, waits for its healthchecks,
    and smoke-tests `/health`, the SPA shell and `/signin` fallback, and `/docs` 404.
  - `files` fields in `apps/api`, `packages/db`, and `packages/contract` so legacy
    deploy ships `dist` (and the generated Prisma client); `.dockerignore` additions
    for local-only files.
- **Why:** The repo only had dev Dockerfiles, so there was no way to run or smoke-test
  the built apps, and legacy deploy silently drops `dist` and the generated Prisma
  client without `files` fields.
- **Impact:** New files `apps/api/Dockerfile.prod`, `apps/web/Dockerfile.prod`,
  `apps/web/nginx.conf`, `compose.prod.yaml`; new CI job; `.dockerignore` additions;
  `files` fields in three `package.json` files. Dev Dockerfiles, `compose.yaml`, and
  app code are unchanged. Mailpit has no TLS, so the prod-like stack points
  `SMTP_URL` at a `*.localhost` alias, the only host class where the mail transport
  does not require STARTTLS.
- **Files:** `apps/api/Dockerfile.prod`, `apps/web/Dockerfile.prod`,
  `apps/web/nginx.conf`, `compose.prod.yaml`, `apps/api/package.json`,
  `packages/db/package.json`, `packages/contract/package.json`, `.dockerignore`,
  `.github/workflows/ci.yml`, `README.md`, `AGENTS.md`, `AI.md`,
  `plans/auth/changes.md`.
- **Status:** implemented.

### 2026-11-11 — Locked Node and pnpm versions

- **Requested by:** Developer
- **Request:** "lock Node and PNPM versions everywhere"
- **Change:** Pinned one Node version (26.13.0) and one pnpm version (11.0.5) across
  the repo:
  - `.nvmrc` at the root with `26.13.0`, as the single source for Node.
  - Root `package.json`: kept `packageManager: pnpm@11.0.5` and added
    `engines: { node: 26.13.0, pnpm: 11.0.5 }`.
  - `pnpm-workspace.yaml`: `engineStrict: true`, so pnpm refuses to install or run
    on another Node version. `pmOnFail` keeps its default, so another pnpm switches
    to `packageManager`'s 11.0.5.
  - Every dev and production Dockerfile: `FROM node:26.13.0-bookworm-slim` (the tag
    was floating `node:26-bookworm-slim`), with the existing
    `npm install -g pnpm@11.0.5` lines unchanged.
  - CI: `actions/setup-node` uses `node-version-file: .nvmrc` instead of
    `node-version: 26`.
- **Why:** The versions had already drifted: the host ran Node 26.12.1, the images
  used the floating `node:26-bookworm-slim` tag (26.13.0 at the time), and CI
  installed the newest 26.x. Nothing enforced Node, while pnpm was pinned in
  `packageManager` and every Dockerfile.
- **Impact:** Contributors need Node 26.13.0 on the host (`nvm install` in the repo);
  pnpm refuses other versions. The dev and production images rebuild on the pinned
  tag. The Docker-only path is unaffected.
- **Files:** `.nvmrc`, `package.json`, `pnpm-workspace.yaml`, `apps/api/Dockerfile`,
  `apps/api/Dockerfile.prod`, `apps/web/Dockerfile`, `apps/web/Dockerfile.prod`,
  `packages/contract/Dockerfile`, `packages/db/Dockerfile`,
  `.github/workflows/ci.yml`, `README.md`, `AGENTS.md`, `AI.md`,
  `plans/auth/changes.md`.
- **Status:** implemented.

## Entry template

```markdown
### YYYY-MM-DD — Short title

- **Requested by:** Developer
- **Request:** Verbatim or close paraphrase of the request
- **Change:** What changed in the plan/scope/decisions
- **Why:** The problem or goal behind it
- **Impact:** Affected contracts, screens, tests, or tasks
- **Files:** Files updated
- **Status:** proposed / in progress / done
```
