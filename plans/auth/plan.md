# Auth Feature Plan

**Status:** `@nestjs/authentication` adopted; Tasks #1–#7 complete; optional follow-ups (throttling, request logging) are deferred
**Last updated:** 2026-11-11
**Source of truth:** [`Full_Stack_Test_Task.pdf`](../../Full_Stack_Test_Task.pdf) and [`AGENTS.md`](../../AGENTS.md)
**Tasks:** [`tasks.md`](./tasks.md)
**Change log:** [`changes.md`](./changes.md)

## Goal

Let a user create an account, sign in, recover access, and reach a protected
application page. The same validation contract must drive the Nest API and the
React forms.

## Scope

### In scope

- Sign-up with email, name, password, and password confirmation.
- Sign-in with email and password using a server-side session and httpOnly cookie.
- Forgot-password and reset-password via `@nestjs/authentication`'s password-reset
  service.
- A users module owning user-related endpoints, including `GET /users/me`.
- A server-side sign-out endpoint.
- Signup, signin, forgot-password, and reset-password pages; a protected `/app`
  page with the exact copy `Welcome to the application.`; and logout.
- Shared request/response types and validation in `@repo/contract`.
- API tests, including the auth/reset flows and the Prisma authentication store
  contract against the test database.
- Docker dev flow, lint, typecheck, build, README and `AI.md`.

### Out of scope

- Refresh tokens, two-factor authentication, magic links, Google/OIDC, email
  verification, roles.
- Production email delivery. Development logs the reset link via the package's
  mail transport; a real provider is a follow-up.
- Multi-device session management UI.

## Current state

- `packages/contract` exports signup/signin/forgot/reset input schemas,
  `userSchema`/`User` (with `emailVerified`), token-free
  `authResponseSchema`/`AuthResponse`, and `apiErrorSchema`/`ApiError`. Contract
  tests pass (19).
- `packages/db` has `User` (`emailVerified` included), `AuthSession`, and
  `AuthEmailToken`; the schema has been generated and pushed to the dev and test
  databases. Store user ids are plain strings, so the package contract's opaque
  ids work without ObjectId conversion.
- `apps/api` has the auth/config/mail packages installed,
  `StandardSchemaValidationPipe` registered, and `PrismaAuthStore` implementing
  `SessionStore`/`EmailTokenStore` in `apps/api/src/prisma/`. The package's
  `authenticationStoreContract()` suite passes against `assessment_test`, including
  concurrency and cross-client persistence.
- The API foundation is implemented: validated environment config, a shared
  `PrismaService`, session authentication, scrypt credentials, the auth controller
  (`/auth/signup`, `/auth/signin`, `/auth/forgot-password`,
  `/auth/reset-password`, `/auth/sign-out`), and the protected `GET /users/me`.
  Security headers, credentialed CORS, and CSRF origin checks are enabled. The
  auth routes and the scaffold `GET /` are `@Public()`.
- Password reset uses the package's `PasswordResetHandler`; the app also registers an
  `EmailVerificationHandler` so the package can mark the reset address verified.
  No user-facing email-verification endpoint exists.
- Task #1 (dependencies, contract, schema), Task #2 (authentication store),
  Task #3 (API foundation), and Task #4 (API e2e tests) are complete. The e2e suite
  covers auth, users, password reset, CSRF, routing, and the OpenAPI document, and
  also runs the store contract: 36 tests passing.
- API docs are served at `/docs` (Swagger UI) and `/docs/json` unless
  `NODE_ENV=production`. They are set up in `apps/api/src/openapi/setup-openapi.ts`;
  request bodies come from `@Body({ schema })` and responses from `standardSchema`
  decorators, with component ids registered API-side. No DTO classes.
- `apps/web` has the foundation in place: Mantine providers, one `QueryClient`,
  TanStack Router file-based routes, the credentialed Axios client, `/users/me` query
  keys and API helpers, and `beforeLoad` auth guards on the `_app`/`_auth` layout
  routes with a router pending view. Task #6 replaced the placeholder screens with
  the signup, signin, forgot-password, reset-password, and `/app` pages, all driven by
  the contract schemas, the mutation hooks in
  `src/modules/auth/queries/auth-mutations.ts`, and guard-driven redirects.
- Task #5 (web foundation) and Task #6 (auth screens) are complete, as is Task #7
  (verification and delivery).
- Verification (2026-11-11, Docker stack): `pnpm lint`, `pnpm typecheck`,
  `pnpm test`, and `pnpm build` pass; `pnpm test` runs 19 contract tests and 1 API
  unit test, and the only build warning is Vite's >500 kB chunk advisory. The API
  e2e command passes 36 tests in 4 files (auth 16, OpenAPI 5, store contract 14,
  app 1). The
  manual Chrome flow covered the signed-out `/app` redirect, signup validation and
  trimming, reload, sign-out/sign-in with the generic credentials error, the
  generic forgot-password state, the logged reset link (signs in and lands on
  `/app`), reused and missing tokens, and the old/new password swap. The cookie
  flags, empty browser storage, token-free response body, security headers, CSRF
  403, and 204 sign-out without a session were all confirmed.
- Docker Compose runs `mongo`, `db`, `contract`, `api`, and `web`; all ports are
  loopback-only. `db` pushes the schema to both the dev and test databases.
- Root scripts run through the `api`/`db` containers; Oxlint is the linter and
  Prettier formats the workspace.

## Decisions

1. **Adopt `@nestjs/authentication`.** Use the package's global guard, credential
   providers, `PasswordHasher`, server-side sessions, and password-reset service
   instead of hand-written JWT/guard/hash/reset code. It is the security-sensitive
   path; prefer the framework implementation.
2. **httpOnly session cookie, not bearer JWT.** Signup/signin set the package's
   `__Host-sid` cookie: HttpOnly, Secure in production, SameSite=Lax. The web app
   uses `withCredentials: true`; there is no token in `localStorage`, no
   `Authorization` header, and no refresh token.
3. **Same-site dev works without Nginx.** The web app on `localhost:5173` and API on
   `localhost:3000` are different origins but the same site. The API enables CORS
   with an explicit credentialed origin, and the package's `session.trustedOrigins`
   includes `WEB_ORIGIN`. No reverse proxy is needed locally.
4. **Global guard, explicit public routes.** `AuthenticationModule` protects every
   route by default. Mark signup, signin, forgot-password, reset-password, and the
   scaffold `GET /` with `@Public()`.
5. **Prisma/MongoDB authentication store.** Implement `SessionStore` and
   `EmailTokenStore` from the package against Prisma. The MongoDB replica set
   supports the required transactions. Run the package's
   `authenticationStoreContract()` suite against `assessment_test`, including the
   concurrency cases.
6. **Password hashing is package-owned.** Use `PasswordHasher` (scrypt, Node
   built-in). Remove the argon2 plan and its native-build risk. `UsersRepository`
   never returns password hashes except to the package's password verification path.
7. **Password reset is package-owned.** `PasswordResetService` creates hashed,
   single-use, expiring links. `POST /auth/forgot-password` returns 202 before
   lookup so it cannot reveal whether an email exists. `POST /auth/reset-password`
   signs the user in (`signIn: true`) and sets the session cookie.
8. **Users module.** `UsersModule` owns `GET /users/me` and uses the package's
   `@CurrentUser()` decorator. `AuthModule` owns `/auth/*` and exports whatever the
   users controller needs; `/auth/me` is not registered.
9. **Contract changes.** `AuthResponse` becomes `{ user: User }` with no
   `accessToken`. Add `ForgotPasswordInput` and `ResetPasswordInput`; reset includes
   matching `confirmPassword`. Signup/signin/reset return `User` or the
   `{ user }` envelope; no raw session token is returned.
10. **Frontend cookie session.** Axios uses `withCredentials`; auth state is the
    `/users/me` query (`User | null`), not a stored token. The `_app`/`_auth`
    `beforeLoad` guards await it with `ensureQueryData`. Sign-out calls
    `POST /auth/sign-out` then `resetAuthState` (clear cache + `router.invalidate()`).
    A 401 on a protected request does the same, so auth form errors stay visible.
11. **CSRF/CORS.** Enable CORS with credentials for `WEB_ORIGIN`, enable the
    package's origin checks/`app.enableCsrfProtection()` on Nest 12.1+, and keep the
    frontend and API same-site. Avoid `SameSite=None`.
12. **Data model.** Add `emailVerified` to `User`, plus `AuthSession` and
    `AuthEmailToken` models for the package stores. Do not add a custom
    `PasswordResetToken` or `RefreshToken` model.

## Data model

- `User` (existing plus `emailVerified Boolean @default(false)`): `id`, unique
  normalized `email`, `name`, `passwordHash`, `emailVerified`, timestamps.
- `AuthSession` (new): the fields `SessionStore` requires, including a unique token
  hash, user id, creation/activity timestamps, and expiry. The raw cookie token is
  never stored.
- `AuthEmailToken` (new): the fields `EmailTokenStore` requires: a unique token
  hash, user id/email, purpose, optional password-hash fingerprint, and creation
  and expiry timestamps. Consumption deletes the record, so there is no separate
  used timestamp. The package owns the reset-link lifecycle.

## API design

| Method | Path                    | Auth           | Success                             | Errors                                         |
| ------ | ----------------------- | -------------- | ----------------------------------- | ---------------------------------------------- |
| `POST` | `/auth/signup`          | public         | 201 `{ user }`, sets session cookie | 400 validation, 409 duplicate email            |
| `POST` | `/auth/signin`          | public         | 200 `{ user }`, sets session cookie | 400 validation, 401 bad credentials            |
| `POST` | `/auth/forgot-password` | public         | 202, no body                        | 400 validation                                 |
| `POST` | `/auth/reset-password`  | public         | 200 `{ user }`, sets session cookie | 400 validation, 400 invalid/expired/used token |
| `GET`  | `/users/me`             | session cookie | 200 `User`                          | 401 missing/invalid session                    |
| `POST` | `/auth/sign-out`        | session cookie | 204, clears cookie                  | 401/204 when already signed out                |

Requests:

- Signup body: `SignUpInput` (`email`, `name`, `password`, `confirmPassword`).
  `confirmPassword` is validation-only and is never stored.
- Signin body: `SignInInput` (`email`, `password`).
- Forgot body: `ForgotPasswordInput` (`email`).
- Reset body: `ResetPasswordInput` (`token`, `password`, `confirmPassword`).

`POST /auth/forgot-password` always returns 202; the package starts the lookup after
the response. `POST /auth/reset-password` signs the user in and sets the cookie, so
the web app can go directly to `/app`. The reset URL points at
`APP_URL/reset-password?token=...`.

## Backend design

New/changed files:

- `apps/api/src/config/env.validation.ts` — Zod schema for `PORT`, `MONGODB_URI`,
  `WEB_ORIGIN`, `APP_URL`, optional `SMTP_URL`, `MAIL_FROM`, and the session
  lifetimes; fail startup on invalid values.
- `apps/api/src/app.module.ts` — `ConfigModule`, `AuthenticationModule.forRootAsync`,
  `MailModule`, `AuthModule`, `UsersModule`, and the existing validation pipe.
- `apps/api/src/prisma/prisma.module.ts`, `prisma.service.ts` — one injected client
  around `getPrismaClient()`, with shutdown handling.
- `apps/api/src/prisma/prisma-auth.store.ts` — implements `SessionStore` and
  `EmailTokenStore`; registers both contracts.
- `apps/api/src/auth/auth.module.ts` — store, session, credential, and mailer
  providers.
- `apps/api/src/users/users.repository.ts` — Prisma create/find/credential/password/
  verification methods; only public user objects leave it.
- `apps/api/src/auth/session-auth.provider.ts` — `SessionCookieProvider` whose
  `validate()` loads the current user.
- `apps/api/src/auth/credentials.service.ts` — `PasswordHasher` registration and
  timing-safe verification; 409 for duplicate email.
- `apps/api/src/auth/auth.controller.ts` — `@Public()` signup, signin,
  forgot-password, reset-password, and sign-out.
- `apps/api/src/auth/mailers/password-reset.mailer.ts` — `PasswordResetHandler`
  (`findUser`, `send`, `updatePassword`).
- `apps/api/src/auth/mailers/email-verification.mailer.ts` — `EmailVerificationHandler`
  whose `markVerified()` updates `User.emailVerified` after a reset.
- `apps/api/src/users/users.module.ts`, `users.controller.ts`, `user.mapper.ts` —
  protected `GET /users/me` using `@CurrentUser()`.
- `apps/api/src/mail/mail.module.ts` — `MailModule` with `LogMailTransport` in dev
  and `SmtpTransport` when `SMTP_URL` is set.
- `apps/api/test/auth.e2e-spec.ts` — cookie-preserving Supertest coverage for
  signup/signin, `/users/me`, sign-out, password reset, CSRF, and routing.

Behavior:

1. Signup registers through `CredentialsService`, calls `SignInService.signIn()` to
   set the session cookie, and returns the public user. Signup does not send an email
   verification link; email verification is not a user-facing flow.
2. Signin verifies the password through the timing-safe `PasswordHasher`, calls
   `SignInService.signIn()`, and returns the public user.
3. Forgot-password calls `PasswordResetService.request(email)` and returns 202
   without waiting for the lookup/mail.
4. Reset-password calls `PasswordResetService.reset(token, password, { signIn: true })`;
   invalid/expired/used tokens become 400; success sets the session cookie and
   returns the user.
5. `GET /users/me` uses `@CurrentUser()` from the package; a deleted user is no
   longer authenticated.
6. Sign-out uses the package's session handling, clears the cookie, and returns 204.
7. `main.ts` enables Helmet, CORS with credentials for `WEB_ORIGIN`, and
   `app.enableCsrfProtection()` on Nest 12.1+ with the same trusted origins.
   Optional: rate-limit auth routes with `@nestjs/throttler`.

## Frontend design

New setup:

- Install Mantine core/hooks, react-hook-form, `@hookform/resolvers`, Axios,
  TanStack Query, and TanStack Router; use `@repo/contract` for schemas/types.
- `src/main.tsx` — `MantineProvider` (with Mantine styles), one `QueryClient`, and
  `RouterProvider`.
- `src/modules/core/` — shared code: `lib/api.ts` and `lib/query-client.ts`,
  `layouts/app-layout.tsx`, `components/loading-screen.tsx` (router pending view),
  and `pages/application-page.tsx` (reads `currentUser` from `_app` route context).
- `src/modules/auth/` — auth module: `layouts/auth-layout.tsx`, `pages/*` for the
  auth screens, `queries/current-user-query.ts` for the `/users/me` query
  (`User | null`), and `lib/` with `auth.api.ts`, `route-guards.ts`
  (`requireSignedInUser`/`requireSignedOutUser`), `auth-search.ts` (same-origin
  `redirect` param), and `auth-session.ts` (`resetAuthState`). No localStorage or
  bearer-token code.
- `src/routes/` — TanStack Router file-based routes. `_app` `beforeLoad` redirects
  signed-out users to `/signin?redirect=<href>` and returns `{ currentUser }`;
  `_auth` `beforeLoad` sends signed-in users to `redirect` or `/app`. `/` and the
  catch-all redirect to `/app` in `beforeLoad`. `src/routeTree.gen.ts` is generated
  by the router plugin/CLI, never edited by hand. Do not write the current-user
  query cache manually or use `useEffect` for redirects/derived state.
- `src/router.tsx` — creates the router with `{ queryClient }` context and
  `defaultPendingComponent`, and registers `onUnauthorized` so a 401 from a
  protected request runs `resetAuthState`. Auth form requests (`/auth/signup`,
  `/auth/signin`, `/auth/forgot-password`, `/auth/reset-password`) are exempt so form
  errors stay visible; `/users/me` treats 401 as `null` and never triggers it.

Pages:

- **Signup** (`/signup`): Mantine inputs for email, name, password, and
  confirmation; `react-hook-form` with `zodResolver(signUpInputSchema)`; field-level
  errors; server 400/409 errors mapped onto the form; success calls
  `resetAuthState` and the `_auth` guard navigates to `/app`.
- **Signin** (`/signin`): email and password with `signInInputSchema`; generic
  credentials error; link to `/forgot-password`; success calls `resetAuthState` and
  the `_auth` guard navigates to `?redirect=` or `/app`.
- **Forgot password** (`/forgot-password`): email with
  `forgotPasswordInputSchema`; generic “if an account exists” success message; no
  email enumeration.
- **Reset password** (`/reset-password?token=...`): reads the token from the query
  string, asks for password + confirmation with `resetPasswordInputSchema`, shows a
  missing/invalid-link state, and on success calls `resetAuthState` so the guard
  goes to `/app`.
- **Application** (`/app`): displays exactly `Welcome to the application.`, the
  user's name/email, and a logout button that calls `/auth/sign-out` then
  `resetAuthState`; the `_app` guard redirects to `/signin`.

Accessibility/UI: visible labels, keyboard submission, disabled submit while
pending, and a password visibility toggle or equivalent. Keep the design simple and
consistent with Mantine defaults.

## Testing

- `@repo/contract`: existing schema tests; add forgot/reset schema tests (including
  mismatched confirmation) and update the auth response type tests.
- Store contract: run `authenticationStoreContract()` from
  `@nestjs/authentication/testing` against the Prisma store and `assessment_test`
  MongoDB, including concurrency cases for session delete/rotation and email-token
  consume. Clean up data between runs.
- API e2e (Vitest + Supertest, test database, cookie-preserving agent):
  - valid signup → 201, user, `Set-Cookie` HttpOnly/SameSite; no token field;
  - duplicate email → 409; invalid signup → 400;
  - valid signin → 200 + cookie; wrong password/unknown email → 401;
  - `/users/me` with the session cookie → 200; without/invalid cookie → 401;
  - sign-out → 204 and the cookie cannot be used afterward;
  - forgot-password known/unknown emails → same 202;
  - reset-password valid token → 200 + session cookie; old password fails; new
    password signs in; reset token cannot be reused; invalid/expired → 400;
  - cross-origin state-changing request without trusted origin is rejected;
  - `/auth/me` is not registered.
- Web tests optional: signup validation, forgot/reset forms, `/app` guard.
- Manual Docker flow: signup → `/app` → reload → sign out; forgot → use the logged
  reset link → reset (signed in) → `/app`; ensure no token appears in browser
  storage.

## Docs and delivery

- Update the root `README.md` API table, auth response/session notes, and env table.
- Update `AGENTS.md` for the package, cookie sessions, store, and endpoint changes.
- Update `AI.md` with the decision to adopt the package over the AI-proposed JWT.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, store contract tests,
  and the API e2e suite.

## Acceptance criteria

- [x] Signup validates email, name (3+), password policy, and matching confirmation.
- [x] Duplicate email returns 409 and does not create a second user.
- [x] Passwords are hashed by `PasswordHasher`; no response contains `passwordHash`
      or `confirmPassword`.
- [x] Signup/signin set an HttpOnly SameSite session cookie; no token is returned or
      stored in `localStorage`.
- [x] `GET /users/me` uses `@CurrentUser()` and the session cookie; `/auth/me` is gone.
- [x] Sign-out clears the session and the cookie.
- [x] Forgot-password returns the same 202 for known and unknown emails.
- [x] Reset-password accepts a valid single-use token, updates the password, signs
      the user in, and invalidates the token; invalid/expired/used tokens return 400.
- [x] The Prisma `SessionStore`/`EmailTokenStore` pass the package contract tests.
- [x] `/signup`, `/signin`, `/forgot-password`, `/reset-password`, and `/app` work
      with the shared contract schemas.
- [x] `/app` shows exactly `Welcome to the application.` and redirects when signed out.
- [x] Lint, typecheck, unit tests, store contract tests, API e2e, and the production
      web build pass.
- [x] README and `AI.md` are complete.

## Risks / notes

- `@nestjs/authentication` is new and its store examples are PostgreSQL-oriented.
  The Mongo/Prisma store must pass the package's contract suite, including the
  atomic-consume cases; Mongo transactions require the existing replica set.
- The package's global guard protects everything by default; the scaffold `GET /`
  and auth routes need `@Public()` or tests will fail with 401.
- Cookie sessions need credentialed CORS, `session.trustedOrigins`, and the CSRF
  origin checks. Keep the web/API same-site; avoid `SameSite=None`.
- The `__Host-` cookie requires `Secure` and a path of `/`. Chrome/Firefox/curl
  accept it on `localhost`; use `cookie.secure: false` for plain-HTTP LAN hosts.
- The package owns reset-token lifecycle; do not add a custom `PasswordResetToken`
  model or return raw tokens. The dev mail transport logs reset links.
- Reset signs the user in, so the frontend goes to `/app`, not `/signin`.
- Session expiry semantics live in `AuthenticationModule` options; changing them
  must be reflected in tests and docs.
