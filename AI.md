# AI Usage and Developer Decisions

**Last updated:** 2026-11-11
**Project:** Full-stack auth assessment
**Assessment brief:** the recruiter's full-stack test task (not included in this repo)

This is the required AI usage record for the assessment. It covers which parts of
the project were AI-assisted, the approaches that worked, what I corrected or
reworked, and the product/architecture decisions I made while directing the work.

The repo was built with heavy AI assistance. I set the direction and scope, reviewed
the output, and sent it back when it was wrong or overcomplicated. I am not claiming
line-by-line authorship of the generated code, tests, Dockerfiles, or plan prose.

## What was AI-assisted

- NestJS and Vite scaffolds, pnpm/Turbo workspace wiring, and the Docker/Compose
  development setup.
- Prisma schema/client plumbing, shared contract schemas, the Prisma
  `SessionStore`/`EmailTokenStore` implementation, and most tests.
- The Nest auth/config/mail wiring, session provider, credentials service, and the
  auth/users endpoints.
- The auth/users e2e suite and its cookie/in-memory-mail test harness.
- The web foundation: Mantine/Query/Router providers, the Axios auth client,
  auth query/guard helpers, file-based routes, and the modular web structure.
- The auth screens: signup/signin/forgot/reset forms with the contract schemas and
  mutation hooks, server-error mapping onto the form fields, and the `/app` page
  with user details and logout.
- README, `AGENTS.md`, the auth plan, and the task/change-log prose.
- The Swagger/OpenAPI setup: document config, the cookie security scheme,
  contract-schema response decorators, API-side schema ids, and the
  `openapi.e2e-spec.ts` document test.
- The structured logging setup: the request-logging middleware, the `AuthAuditLogger`
  over the authentication package's events, and their unit tests.
- Diagnosis of runtime issues such as hot-reload failures, orphaned Nest processes,
  and the missing `procps` package.
- Delivery verification: running the workspace checks and the API e2e suite, driving
  the manual browser flow (signup, reload, sign-out, sign-in, forgot/reset) through
  Chrome DevTools, checking cookie flags and browser storage, and the final README
  pass.
- The GitHub Actions workflow (`.github/workflows/ci.yml`): the `:inner` Turbo
  scripts, the single-node MongoDB replica set CI starts itself, the directConnection
  test URIs, and the schema push to the test database.
- The submission-review polish group: the contract max lengths, the `/health` endpoint
  that replaced the scaffold `GET /`, the router `ErrorScreen`, the `aria-invalid`
  wiring, the `autoCodeSplitting` config, and the first web tests (Vitest + Testing
  Library + jsdom). The developer asked for the polish group; the specific choices
  were AI proposals.

I made the decisions below, reviewed the generated output, and corrected the parts
that did not match the architecture or product requirements.

## What worked

- Giving the stack and constraints up front: React + Vite, pnpm + Turbo, separate
  Docker services, shared DB/contract packages, and the auth scope.
- Using the generated Vite/Nest projects as starting points instead of asking AI to
  invent a project structure from scratch.
- Pointing at an existing package layout as a reference for the package shape.
- Using Context7 for current framework/library documentation.
- An architect/writer agent split, configured in `.opencode/agents/`. The architect
  (a high-reasoning model with no edit rights) investigates, plans, and reviews
  every diff; the writer (a fast, cheaper model) implements a self-contained
  spec and reports its verification results. Every handoff states the goal, the
  exact files and changes, the constraints, and the commands to verify. That kept
  each change reviewable, and the diff review caught out-of-scope edits, such as
  unrelated files being reformatted.
- Running the stack, reading logs, and correcting at the decision level instead of
  accepting a one-shot implementation.
- Running the authentication package's own store contract against the real test
  database, including its concurrency cases, instead of relying on hand-written
  assumptions about the store's atomicity.
- Following the package's current interfaces and Nest's built-in
  `useSecurityHeaders()`/`enableCsrfProtection()` instead of older examples. The
  reset flow's `markVerified` turned out to belong to the package's
  `EmailVerificationHandler`, not `PasswordResetHandler`, so the API registers a
  verification handler even though it exposes no verification screen.
- Testing through the real HTTP stack with Supertest. The test client drops Secure
  cookies over HTTP, so only the test auth options disable `cookie.secure`; production
  keeps the package's `__Host-sid` default.
- Keeping `plans/auth/` with the plan, task checklist, and change log so the intent
  behind each change stays visible.
- Driving the real browser flow against the Docker stack (not just unit checks)
  confirmed the cookie flags, empty browser storage, guard redirects, and the
  single-use reset link end to end. This should cover Safari as well, since it
  handles Secure cookies on `localhost` differently from Chrome and Firefox.

The plan files under `plans/auth/` and `AGENTS.md` were part of that workflow: the
plan and its task list were the spec each prompt pointed at, and `AGENTS.md`
carried the conventions (stack, module layout, naming, and what not to build) from
one session to the next.

## Where I changed AI's direction

- **Docker dev architecture.** AI first kept only MongoDB in Compose, then built a
  single workspace container with Compose Watch. I rejected that and required one
  Dockerfile and Compose service per app/package, with source bind mounts and
  container-owned dependencies.
- **Package rebuild loop.** I required packages to run `tsup --watch` and the
  importing API to restart when a package's `dist` changed. The first Docker layout
  only restarted on API source changes, so package changes did not trigger it.
- **Nodemon behavior.** AI ran `nest build && node dist/main.js` on every restart. I
  required nodemon to restart the Nest dev server with `nest start` only.
- **SWC configuration.** AI repeated `-b swc` in the nodemon command after I had
  already set SWC as the builder in `nest-cli.json`. I had the duplicate removed.
- **Lint tool.** AI set up Biome. I replaced it with Oxlint across the API, packages,
  and Vite app, and removed Biome entirely.
- **Auth mechanism.** AI planned bearer JWTs in `localStorage`, argon2, a custom
  guard, and custom password-reset tokens. After reviewing
  `@nestjs/authentication`, I adopted its httpOnly server-side sessions,
  `PasswordHasher` (scrypt), global guard with `@Public()`, and package password-reset
  service. This removes the token from browser storage and the native argon2
  dependency.
- **Shared packages.** I required a shared Prisma DB package and a shared contract
  package for input/output types, rather than keeping those concerns inside the API.
- **Password confirmation.** AI's original signup contract had no confirmation field.
  I added the requirement that it must match the password.
- **Password recovery.** AI's auth plan did not include forgot/reset password. I
  added both flows, including the reset-token model and the dev reset link.
- **User endpoint/module.** AI planned user info at `/auth/me`. I moved it to a
  dedicated `UsersModule` at `/users/me` and removed `/auth/me` from the plan.
- **Planning process.** I introduced `plans/` with `plan.md` and `tasks.md`, then
  required an append-only `changes.md` per plan so the original plan and later
  developer-requested refinements stay visible.
- **Skill usage.** I require the relevant skills to be loaded at the start of a task,
  before implementation, rather than after the work is done.
- **One class per file.** I required every class to live in its own file, with related
  classes grouped in feature subfolders such as `src/auth/mailers/`.
- **Type-aware linting and formatting.** I enabled type-aware Oxlint for the API with
  `oxlint-tsgolint`, and added a Prettier configuration with `format`/`format:check`
  scripts; Oxlint remains the linter.
- **Web routing and structure.** I required TanStack Router file-based routes and a
  modular `core`/`auth` split instead of a manual route tree and a flat `src` layout.
- **Auth guards.** I first required a root-layout `/users/me` query with
  `<Navigate>` redirects instead of `beforeLoad`. That version had a reload loop: the
  global 401 handler did `window.location.href = '/signin'` even on `/signin`, and
  nothing redirected. I then asked AI to “fix the auth check and redirects … according
  to community standards”. AI proposed TanStack Router’s documented pattern, and I
  chose it: `beforeLoad` guards on `_app`/`_auth` using `ensureQueryData` and
  `throw redirect()`, a validated `?redirect=` return path, and `resetAuthState`
  (cache clear + `router.invalidate()`) on session changes and 401s. The query
  cache is still never written by hand.
- **No `useEffect` for redirects or derived state.** I require router primitives
  for redirects and derived render state instead of effects.
- **Public contract name and module folders.** I renamed `PublicUser` to `User` and
  settled the web layout: auth `layouts`/`pages`/`queries`/`lib`; core
  `layouts`/`pages`/`components`/`lib`.
- **Expressive naming.** I require method and variable names to state intent instead
  of generic placeholders such as `verify`, `found`, or `valid`.
- **Safari session cookie.** The AI's browser verification only used Chrome, and it
  relied on the auth package's note that browsers accept Secure cookies on
  `http://localhost`. My fresh-clone smoke test in Safari showed signup creating the
  account but `GET /users/me` returning 401, because Safari drops Secure cookies over
  plain HTTP. The fix is an explicit `SESSION_COOKIE_SECURE` flag, secure by default
  and disabled only in the dev Compose config; the AI proposed the env-flag design.

## Product decisions

- **Password confirmation on signup.** I required a `confirmPassword` field that must
  match the password. The rule lives in the shared contract and is covered by tests,
  so the API and future form use the same check.
- **Forgot-password and reset-password flows.** I added both to the auth scope. The
  plan uses short-lived, single-use reset tokens; the development mailer logs the
  reset link because production email delivery is not part of this build.
- **User info belongs to a users module.** I originally asked for `/me` and then
  corrected it to `/users/me` under a dedicated `UsersModule`. `/auth/me` is removed
  from the current plan.
- **The auth pages are part of the feature.** Signup, signin, forgot-password,
  reset-password, the protected `/app` page, and logout are in scope.
- **API docs.** I asked for Swagger docs via `@nestjs/swagger`. The `/docs` and
  `/docs/json` paths, the non-production gating, and the API-side schema ids were
  AI proposals.
- **Request logging.** I asked for structured request logging. The built-in JSON
  `ConsoleLogger` instead of pino/winston, the logged field set, the
  `X-Request-Id` validation/reuse, and the auth-audit field allowlist were AI
  proposals.

## Architecture and stack

- **React with Vite for the frontend.** I chose React over Vue in the stack
  questions and scaffolded the Vite app myself. I then had it adapted as `@repo/web`
  in the monorepo.
- **pnpm workspaces + Turbo.** I chose this monorepo setup rather than separate
  frontend/backend repos or a simple two-folder layout.
- **Shared packages for data and contracts.** I required one shared Prisma database
  package and one shared contract package for the input/output types used by both
  backend and frontend.
- **Prisma with MongoDB, including all needed models.** I chose the Prisma DB package
  and asked for all models. The exact field-level schema was an AI proposal reviewed
  through the contract/DB tasks.
- **NestJS API scaffolded with the globally installed Nest CLI.** I asked for the API
  to be generated with `nest new` rather than hand-building the Nest project.
- **Frontend libraries.** I selected Mantine, react-hook-form, Zod, Axios, TanStack
  Query, and TanStack Router as the frontend stack.
- **Docker Compose for local MongoDB.** I chose Compose for local infrastructure
  rather than a host-installed MongoDB or Atlas.
- **Docker for all apps and packages.** I required local development to run every
  app and package in containers, not on the host.

## Local development decisions

- **One Dockerfile and Compose service per app/package.** I rejected the initial
  single-container/Compose-Watch direction and asked for separate `api`, `web`,
  `db`, and `contract` services.
- **Bind-mounted source and container-owned `node_modules`.** I required source
  volumes so containers see code changes, with dependencies kept in container
  volumes instead of leaking the host's `node_modules` in.
- **Packages watch with tsup; the importing app restarts.** I required package
  rebuilds to trigger the API restart, rather than rebuilding the app manually.
- **Nodemon restarts the Nest dev server, not a build.** I corrected the first
  setup, which ran `nest build && node ...`; I wanted nodemon to restart `nest start`
  directly.
- **SWC comes from `nest-cli.json`, not the nodemon command.** I set the builder in
  the Nest config and asked for the duplicated `-b swc` mention to be removed from
  the nodemon exec command.
- **Oxlint everywhere; Biome removed.** I chose Oxlint for the API, packages, and
  the Vite app, and had Biome removed rather than running two linters.
