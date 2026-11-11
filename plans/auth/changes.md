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
