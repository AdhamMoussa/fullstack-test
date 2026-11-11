# AI Usage and Developer Decisions

**Last updated:** 2026-11-11
**Project:** Full-stack auth assessment
**Assessment brief:** [`Full_Stack_Test_Task.pdf`](./Full_Stack_Test_Task.pdf)

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
- README, `AGENTS.md`, the auth plan, and the task/change-log prose.
- Diagnosis of runtime issues such as hot-reload failures, orphaned Nest processes,
  and the missing `procps` package.

I made the decisions below, reviewed the generated output, and corrected the parts
that did not match the architecture or product requirements.

## What worked

- Giving the stack and constraints up front: React + Vite, pnpm + Turbo, separate
  Docker services, shared DB/contract packages, and the auth scope.
- Using the generated Vite/Nest projects as starting points instead of asking AI to
  invent a project structure from scratch.
- Pointing at an existing package layout as a reference for the package shape.
- Using Context7 for current framework/library documentation.
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
- Keeping `plans/auth/` with the plan, task checklist, and change log so the intent
  behind each change stays visible.

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
- **Expressive naming.** I require method and variable names to state intent instead
  of generic placeholders such as `verify`, `found`, or `valid`.

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
