# Auth Assessment

[![CI](https://github.com/AdhamMoussa/fullstack-test/actions/workflows/ci.yml/badge.svg)](https://github.com/AdhamMoussa/fullstack-test/actions/workflows/ci.yml)

Sign-up / sign-in module: NestJS + MongoDB API and a React frontend, in a pnpm + Turbo monorepo. It implements the recruiter's assessment brief (not included in this repo).

> **Status:** the assessment scope is complete. The API covers signup/signin with server-side sessions, password reset, `/users/me`, structured request logging, and Swagger/OpenAPI docs; the shared contract drives API and form validation; a Prisma-backed store holds sessions and email tokens; and the React app has signup, signin, forgot/reset password, and a protected `/app` with logout. Optional follow-up not done: production email delivery.

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

- **Docker Desktop** is required. The whole stack runs in containers.
- **Node 26 and pnpm 11** are only needed for host scripts: installing dependencies (this updates `pnpm-lock.yaml`), editor types and Oxlint, and the root commands. They are not needed to run the app.

## Quick start

### Docker only

With Docker running, this starts the whole stack without Node or pnpm on the host:

```bash
docker compose up --build
```

The `pnpm` commands below are for host tooling (lockfile updates, editor types, Oxlint) and are all shortcuts around that same Compose stack.

```bash
pnpm install   # host: lockfile, editor types, Oxlint
pnpm dev       # builds images and starts mongo, db, contract, api, and web in the foreground
```

The API is at http://localhost:3000 and the web app at http://localhost:5173. Stop the stack with `Ctrl+C`, or run `pnpm dev:down`.

No `.env` file is needed: `compose.yaml` provides development defaults.

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

## API

| Method | Path                    | Auth                      | Status                                                                           |
| ------ | ----------------------- | ------------------------- | -------------------------------------------------------------------------------- |
| `GET`  | `/health`               | none                      | 200 `{ "status": "ok" }`; 503 when MongoDB does not answer a ping                |
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
UI first: the browser stores the httpOnly session cookie (`sid` in Docker dev,
`__Host-sid` over HTTPS), and "Try it out" on
`GET /users/me` then works.

## Sessions and password reset

Auth uses `@nestjs/authentication` server-side sessions in an httpOnly cookie.
There are no JWT or localStorage secrets. Signup returns 409 when an email is already registered. That tells the visitor an account exists, unlike forgot-password; it is the usual signup trade-off, kept deliberately so the form can send them to sign in.

- The session is a server-side record in MongoDB (`auth_sessions`). The browser gets
  only the session cookie. Production uses `__Host-sid` (HttpOnly, Secure,
  SameSite=Lax, Path=/). Local Docker dev sets `SESSION_COOKIE_SECURE=false`, so the
  cookie is `sid` without Secure, because Safari rejects Secure cookies over
  `http://localhost` (Chrome and Firefox accept them). Never disable it in
  production. Lifetimes come from `SESSION_ABSOLUTE_TTL` (default 7d) and
  `SESSION_IDLE_TTL` (default 1d).
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

## Services

| Service    | Port (localhost only) | What it does                                                                                                                                                                                         |
| ---------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mongo`    | 27017                 | MongoDB 7.0, single-node replica set `rs0` (Prisma needs transactions; MongoDB 8 crashes on Linux kernel 6.19+)                                                                                      |
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

## Tests

```bash
pnpm test                                                        # unit tests (API + contract + web)
docker compose exec api pnpm --filter @repo/api test:e2e         # e2e tests
docker compose exec api pnpm --filter @repo/api exec vitest run src/health/health.controller.spec.ts
```

Tests run against a separate `assessment_test` database. Both API Vitest configs set `MONGODB_URI` to `MONGODB_TEST_URI`, so tests never touch dev data. The `db` container pushes the schema to the test database when it starts. `pnpm test` runs 25 contract tests, 23 API unit tests, and 14 web tests (Vitest + Testing Library in jsdom: signup and forgot-password forms, the redirect search schema, and API error mapping) — 62 unit tests in total. The e2e command runs 37 tests across the auth, OpenAPI, store contract, and health suites. The API e2e suite covers signup/signin, sessions and `/users/me`, sign-out, password reset, CSRF, routing, and the OpenAPI document, and also runs the `@nestjs/authentication` store contract for sessions and email tokens, including its concurrency and cross-client persistence cases. GitHub Actions (`.github/workflows/ci.yml`) runs format check, lint, typecheck, build, unit tests, and the API e2e suite against a MongoDB replica set on every push to `main` and every pull request.

## Logging

The API writes JSON lines to stdout with Nest's built-in `ConsoleLogger`
(`json` + `flattenParams`); no logging library is added.

- One `HTTP` line per request, written when the response closes: `requestId`,
  `method`, `path` (query string removed), `statusCode`, `durationMs`, `ip`,
  `userAgent`, `contentLength`, and `aborted` for client disconnects. A safe incoming
  `X-Request-Id` is reused and otherwise generated, and it is echoed back on the
  response.
- `AuthAudit` lines from `@nestjs/authentication` events: sign-in, sign-out,
  password-reset requested (`accountFound` only, never the address), password reset,
  and email verified.
- Request and response bodies, cookies, tokens, query strings, and email addresses
  are never logged.

Example `HTTP` line:

```text
{"level":"log","pid":1725,"timestamp":1794410926688,"message":"GET /health 200","context":"HTTP","requestId":"319f6047-d668-4762-b634-bf7061fa02c3","method":"GET","path":"/health","statusCode":200,"durationMs":10.8,"ip":"::ffff:172.20.0.1","userAgent":"curl/8.7.1","contentLength":15}
```

Example `AuthAudit` line:

```text
{"level":"log","pid":1725,"timestamp":1794410929737,"message":"auth.sign-in","context":"AuthAudit","userId":"6af489b188cd9eca145d0ea8","method":"password"}
```

Read them with `docker compose logs api`, or
`docker compose logs api --no-log-prefix | jq` when `jq` is installed.

## Environment variables

Docker dev sets these in `compose.yaml`. The `.env.example` files in `apps/api` and `packages/db` show the values to use if you run something on the host instead.

| Variable                | Used by                        | Docker dev value                                       |
| ----------------------- | ------------------------------ | ------------------------------------------------------ |
| `MONGODB_URI`           | api, db                        | `mongodb://mongo:27017/assessment?replicaSet=rs0`      |
| `MONGODB_TEST_URI`      | api, db (tests)                | `mongodb://mongo:27017/assessment_test?replicaSet=rs0` |
| `NODE_ENV`              | api (docs toggle)              | `development` (the docs are disabled in `production`)  |
| `PORT`                  | api                            | `3000`                                                 |
| `WEB_ORIGIN`            | api (CORS/CSRF trusted origin) | `http://localhost:5173`                                |
| `APP_URL`               | api (reset links)              | `http://localhost:5173`                                |
| `MAIL_FROM`             | api (mail sender)              | `Auth Assessment <no-reply@localhost>`                 |
| `SESSION_ABSOLUTE_TTL`  | api                            | `7d`                                                   |
| `SESSION_IDLE_TTL`      | api                            | `1d`                                                   |
| `SESSION_COOKIE_SECURE` | api (session cookie)           | `false` (default `true`; see the session notes)        |
| `SMTP_URL`              | api (optional)                 | unset; logs mail in development                        |
| `VITE_API_URL`          | web build; api (root builds)   | `http://localhost:3000`                                |

## Deploying

The Dockerfiles and `compose.yaml` are for development only; there is no production
image.

`pnpm build` produces:

- `apps/api/dist` — run it with `NODE_ENV=production node apps/api/dist/main.js` from
  an installed workspace.
- `apps/web/dist` — static files; serve them with an SPA fallback to `index.html`.

Required production environment:

- `NODE_ENV=production` (also disables `/docs`).
- `MONGODB_URI`, pointing at a MongoDB replica set, 7.0 or newer: Prisma needs
  transactions, so a standalone server will not do (Atlas qualifies). On
  self-managed Linux hosts with kernel 6.19+, MongoDB 8 cannot start
  (SERVER-121912), while Atlas is unaffected.
- `WEB_ORIGIN` and `APP_URL`, both HTTPS origins.
- `SMTP_URL`: required in production. The API refuses to start without it, so reset
  links and their tokens never reach the logs.
- `MAIL_FROM`.
- Leave `SESSION_COOKIE_SECURE` unset or `true`.
- `VITE_API_URL` at web build time: the build fails without it.

Run `MONGODB_URI=… pnpm --filter @repo/db push` against the production database once
before the first start, so the unique email index and the auth collections exist.

- Serve both apps over HTTPS: the `__Host-sid` cookie is `Secure`.
- Keep the web app and the API same-site (for example `app.example.com` and
  `api.example.com`), because the session cookie is `SameSite=Lax`.
- Behind a reverse proxy or load balancer, the logged client IP is the proxy's until
  Express `trust proxy` is configured in `apps/api/src/main.ts`.
- Logs are JSON on stdout, for the platform to collect.

## Troubleshooting

- **A new dependency isn't found in a container.** Restart with `pnpm dev`; plain `docker compose up` keeps the old `node_modules` volumes.
- **`pnpm build`/`test` says the service isn't running.** Start the stack with `pnpm dev` first.
- **The API doesn't reflect a schema change.** Run `pnpm db:generate` (and `pnpm db:push` for new indexes).
- **Forgot-password link:** in Docker dev the API logs the reset URL; check `docker compose logs api` (production email delivery is not wired yet).
- **Mongo exits right after starting on Linux.** MongoDB 8 crashes on kernel 6.19+; this repo uses `mongo:7.0`. If you upgraded from an older checkout, run `docker compose down -v` once (the 8.0 data files can't be opened by 7.0).
