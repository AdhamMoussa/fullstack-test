# Auth Assessment

Sign-up / sign-in module: NestJS + MongoDB API and a React frontend, in a pnpm + Turbo monorepo. Requirements are in [`Full_Stack_Test_Task.pdf`](./Full_Stack_Test_Task.pdf).

> **Status:** the assessment scope is complete. The API covers signup/signin with server-side sessions, password reset, `/users/me`, and Swagger/OpenAPI docs; the shared contract drives API and form validation; a Prisma-backed store holds sessions and email tokens; and the React app has signup, signin, forgot/reset password, and a protected `/app` with logout. Optional follow-ups not done: auth rate limiting, structured request logging, and production email delivery.

## Layout

| Path                | Package          | What it is                                                            |
| ------------------- | ---------------- | --------------------------------------------------------------------- |
| `apps/api`          | `@repo/api`      | NestJS 12 API (ESM)                                                   |
| `apps/web`          | `@repo/web`      | React + Vite frontend (Mantine, TanStack Router/Query)                |
| `packages/db`       | `@repo/db`       | Prisma 6 schema and client for MongoDB (server-only)                  |
| `packages/contract` | `@repo/contract` | Shared Zod schemas and inferred request/response types (browser-safe) |

Feature plans, task checklists, and change logs live in `plans/`; auth is in `plans/auth/`.
AI usage, corrections, and my human decisions are recorded in [`AI.md`](./AI.md).

## Prerequisites

- **Docker Desktop**. Everything runs in containers.
- **Node 26 and pnpm 11** on the host. You need them to install dependencies (this updates `pnpm-lock.yaml`), to give your editor types and Oxlint, and to run the root scripts. The apps don't run on the host.

## Quick start

```bash
pnpm install   # host: lockfile, editor types, Oxlint
pnpm dev       # builds images and starts mongo, db, contract, api, and web in the foreground
```

The API is at http://localhost:3000 and the web app at http://localhost:5173. Stop the stack with `Ctrl+C`, or run `pnpm dev:down`.

No `.env` file is needed: `compose.yaml` provides development defaults.

## Services

| Service    | Port (localhost only) | What it does                                                                                                                                                                                         |
| ---------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mongo`    | 27017                 | MongoDB 8, single-node replica set `rs0` (Prisma needs transactions)                                                                                                                                 |
| `db`       | 5555 (Prisma Studio)  | Generates the Prisma client and pushes the schema to the dev and test databases, then rebuilds `packages/db` on change (`tsup --watch`)                                                              |
| `contract` | —                     | Rebuilds the shared schemas/types on change (`tsup --watch`)                                                                                                                                         |
| `web`      | 5173                  | Vite dev server with HMR for the React app                                                                                                                                                           |
| `api`      | 3000                  | Runs Nest via `nodemon` → `nest start` (SWC builder from `nest-cli.json`). It restarts when `apps/api/src`, the built `@repo/db`, the generated Prisma client, or the built `@repo/contract` changes |

Source code is bind-mounted into the containers, so edits apply immediately. Each container has its own `node_modules`; your host's `node_modules` is never used inside them.

## Everyday workflows

| Task                         | Do this                                                                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Edit API code                | Save. The API restarts in about a second.                                                                                                           |
| Edit `packages/db/src`       | Save. `db` rebuilds and the API restarts.                                                                                                           |
| Edit `packages/contract/src` | Save. `contract` rebuilds and the API restarts.                                                                                                     |
| Edit `apps/web/src`          | Save. Vite HMR updates the browser.                                                                                                                 |
| Change the Prisma schema     | `pnpm db:generate && pnpm db:push` (the API restarts after generation)                                                                              |
| Add/upgrade a dependency     | `pnpm --filter <pkg> add <dep>` on the host, then restart `pnpm dev` (it rebuilds images and refreshes container `node_modules`)                    |
| Inspect data                 | `pnpm db:studio`, then open http://localhost:5555, or connect any Mongo client to `mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true` |
| Start from an empty database | `docker compose down -v` (deletes all Mongo data), then `pnpm dev`                                                                                  |

## Scripts

Run from the repo root. Everything except `dev`, `dev:down` and `infra:*` runs inside the running containers, so start `pnpm dev` first.

| Script                                   | What it does                                                       |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `pnpm dev`                               | Build images, renew `node_modules` volumes, and start all services |
| `pnpm dev:down`                          | Stop and remove the containers (Mongo data is kept)                |
| `pnpm build`                             | Build all packages and apps (Turbo)                                |
| `pnpm lint`                              | Oxlint for the whole workspace                                     |
| `pnpm typecheck`                         | `tsc --noEmit` for the whole workspace                             |
| `pnpm test`                              | Unit tests (Vitest)                                                |
| `pnpm format`                            | Format the workspace with Prettier                                 |
| `pnpm format:check`                      | Check formatting without writing files                             |
| `pnpm db:generate`                       | Regenerate the Prisma client                                       |
| `pnpm db:push`                           | Push the schema (indexes) to the dev database                      |
| `pnpm db:studio`                         | Prisma Studio on http://localhost:5555                             |
| `pnpm infra:dev` / `pnpm infra:dev:down` | Start/stop MongoDB only                                            |

## Shared contract

`@repo/contract` is the single source of truth for the API's HTTP shapes and validation rules. It exports:

- `signUpInputSchema` / `SignUpInput` — email, name (3+), password (8+, letter, number, special), and matching password confirmation
- `signInInputSchema` / `SignInInput` — email and password
- `forgotPasswordInputSchema` / `ForgotPasswordInput` — email
- `resetPasswordInputSchema` / `ResetPasswordInput` — token, new password, and matching confirmation
- `userSchema` / `User` — the public user shape (no password hash)
- `authResponseSchema` / `AuthResponse` — `{ user }` only; the session is the httpOnly cookie
- `apiErrorSchema` / `ApiError` — shared error response

Nest validates request bodies with these schemas through `StandardSchemaValidationPipe`; the web forms use the same schemas with `zodResolver`. Do not duplicate these rules in app code.

## Web app

| Route                     | Access     | Behavior                                                      |
| ------------------------- | ---------- | ------------------------------------------------------------- |
| `/signup`                 | signed out | email, name, password, confirm                                |
| `/signin`                 | signed out | email, password; link to forgot password; honors `?redirect=` |
| `/forgot-password`        | signed out | always shows the same "check your email" message              |
| `/reset-password?token=…` | signed out | new password + confirmation; signs in                         |
| `/app`                    | signed in  | `Welcome to the application.`, name/email, log out            |

`/` and unknown paths redirect to `/app`.

Signed-out users who visit `/app` go to `/signin?redirect=/app`; signed-in users who
visit an auth page go to `/app`.

- Guards run in TanStack Router `beforeLoad` against the `/users/me` query.
- After any session change the app clears the query cache and re-runs the guards.
- The browser never sees the session token: no localStorage/sessionStorage, and the
  cookie is HttpOnly.

## Tests

```bash
pnpm test                                                        # unit tests (API + contract)
docker compose exec api pnpm --filter @repo/api test:e2e         # e2e tests
docker compose exec api pnpm --filter @repo/api exec vitest run src/app.controller.spec.ts
```

Tests run against a separate `assessment_test` database. Both Vitest configs set `MONGODB_URI` to `MONGODB_TEST_URI`, so tests never touch dev data. The `db` container pushes the schema to the test database when it starts. `pnpm test` runs 19 contract tests and 1 API unit test; the e2e command runs 36 tests across the auth, OpenAPI, store contract, and app suites. The API e2e suite covers signup/signin, sessions and `/users/me`, sign-out, password reset, CSRF, routing, and the OpenAPI document, and also runs the `@nestjs/authentication` store contract for sessions and email tokens, including its concurrency and cross-client persistence cases.

## Environment variables

Docker dev sets these in `compose.yaml`. The `.env.example` files in `apps/api` and `packages/db` show the values to use if you run something on the host instead.

| Variable               | Used by                        | Docker dev value                                       |
| ---------------------- | ------------------------------ | ------------------------------------------------------ |
| `MONGODB_URI`          | api, db                        | `mongodb://mongo:27017/assessment?replicaSet=rs0`      |
| `MONGODB_TEST_URI`     | api, db (tests)                | `mongodb://mongo:27017/assessment_test?replicaSet=rs0` |
| `NODE_ENV`             | api (docs toggle)              | `development` (the docs are disabled in `production`)  |
| `PORT`                 | api                            | `3000`                                                 |
| `WEB_ORIGIN`           | api (CORS/CSRF trusted origin) | `http://localhost:5173`                                |
| `APP_URL`              | api (reset links)              | `http://localhost:5173`                                |
| `MAIL_FROM`            | api (mail sender)              | `Auth Assessment <no-reply@localhost>`                 |
| `SESSION_ABSOLUTE_TTL` | api                            | `7d`                                                   |
| `SESSION_IDLE_TTL`     | api                            | `1d`                                                   |
| `SMTP_URL`             | api (optional)                 | unset; logs mail in development                        |
| `VITE_API_URL`         | web                            | `http://localhost:3000`                                |

## Sessions and password reset

Auth uses `@nestjs/authentication` server-side sessions in an httpOnly `__Host-sid`
cookie. There are no JWT or localStorage secrets.

- The session is a server-side record in MongoDB (`auth_sessions`). The browser gets
  only the `__Host-sid` cookie (HttpOnly, Secure, SameSite=Lax, Path=/). Lifetimes
  come from `SESSION_ABSOLUTE_TTL` (default 7d) and `SESSION_IDLE_TTL` (default 1d).
- CSRF origin checks reject state-changing requests from untrusted origins (403);
  CORS allows credentials only from `WEB_ORIGIN`; security headers (CSP, HSTS,
  X-Frame-Options) are enabled.
- Reset tokens are stored only as SHA-256 hashes (`auth_email_tokens`).

Reset flow:

1. Submit an email on `/forgot-password`. The API returns 202 whether or not the
   account exists.
2. In dev, the reset link is logged: `docker compose logs api | grep reset-password`
   (set `SMTP_URL` to send real mail).
3. Open the link and choose a new password.
4. The API marks the token used, updates the password, marks the email verified,
   signs the user in, and the app goes to `/app`.
5. Reused, expired, or invalid links return 400 and the page offers a new link.

## API

| Method | Path                    | Auth                      | Status                                                                           |
| ------ | ----------------------- | ------------------------- | -------------------------------------------------------------------------------- |
| `GET`  | `/`                     | none                      | Scaffold endpoint, returns `Hello World!`                                        |
| `POST` | `/auth/signup`          | none                      | 201 `{ user }` + httpOnly session cookie; 400 invalid input, 409 duplicate email |
| `POST` | `/auth/signin`          | none                      | 200 `{ user }` + session cookie; 401 bad credentials                             |
| `POST` | `/auth/forgot-password` | none                      | 202 generic empty response for known and unknown emails; 400 invalid input       |
| `POST` | `/auth/reset-password`  | none                      | 200 `{ user }` + session cookie (signed in); 400 invalid, expired, or used token |
| `POST` | `/auth/sign-out`        | session cookie (optional) | 204; ends the current session and clears the cookie (204 even without a session) |
| `GET`  | `/users/me`             | session cookie            | 200 with the public user; 401 without a valid session                            |

Errors use the contract's `ApiError`: `{ statusCode, message, error }`, where `message` is a string or, for validation errors, an array like `["email: Invalid email address"]`. Status codes: 400 validation, 401 bad credentials/no session, 403 untrusted origin, 409 duplicate email.

The contract `User` includes `id`, `email`, `name`, `emailVerified`, and ISO
`createdAt`/`updatedAt` timestamps. Passwords, hashes, session tokens, and reset
tokens never appear in responses. The reset URL is logged in development; set `SMTP_URL` to send
real mail.

## API docs

Swagger UI is at http://localhost:3000/docs and the OpenAPI JSON at
http://localhost:3000/docs/json. The docs are served when `NODE_ENV` is not
`production`.

Request bodies and responses are generated from the `@repo/contract` Zod schemas (with
`@Body({ schema })` and `standardSchema` response decorators); there are no DTO
classes. To try a protected route, call `POST /auth/signin` (or `/auth/signup`) in the
UI first: the browser stores the httpOnly `__Host-sid` cookie, and "Try it out" on
`GET /users/me` then works.

## Troubleshooting

- **A new dependency isn't found in a container.** Restart with `pnpm dev`; plain `docker compose up` keeps the old `node_modules` volumes.
- **`pnpm build`/`test` says the service isn't running.** Start the stack with `pnpm dev` first.
- **The API doesn't reflect a schema change.** Run `pnpm db:generate` (and `pnpm db:push` for new indexes).
- **Forgot-password link:** in Docker dev the API logs the reset URL; check `docker compose logs api` (production email delivery is not wired yet).
