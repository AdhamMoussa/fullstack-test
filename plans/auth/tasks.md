# Auth Tasks

Plan: [`plan.md`](./plan.md). Plan refinements: [`changes.md`](./changes.md).
Update checkboxes as work lands; keep the commands in the verification section
current.

## 0. Groundwork — done

- [x] Shared contract schemas: signup (with confirmation), signin, public user,
      auth response, API error.
- [x] Contract tests, including mismatch and missing confirmation (11 passing at
      baseline).
- [x] Prisma `User` model with unique email, name, password hash, timestamps.
- [x] Lazy Prisma client getter and API `StandardSchemaValidationPipe`.
- [x] Docker dev services (`mongo`, `db`, `contract`, `api`, `web`) and test DB.
- [x] Oxlint on every package; Biome removed.
- [x] Vite React scaffold integrated as `@repo/web` with HMR.
- [x] Plan/docs updated to adopt `@nestjs/authentication` and httpOnly sessions.

## 1. Dependencies, contract, and schema

- [ ] Install API dependencies: `@nestjs/authentication`, `@nestjs/config`,
      `@nestjs/mail`, and optional `@nestjs/throttler`; add `zod` for env validation.
      Do not add `@nestjs/jwt` or argon2.
- [ ] Update `AuthResponse` to `{ user: PublicUser }` with no `accessToken`; keep the
      signup/signin public-user shape.
- [ ] Add `forgotPasswordInputSchema`/`ForgotPasswordInput` and
      `resetPasswordInputSchema`/`ResetPasswordInput` (matching `confirmPassword`).
- [ ] Add contract tests for forgot/reset schemas and the token-free auth response.
- [ ] Add `emailVerified Boolean @default(false)` to `User`.
- [ ] Add `AuthSession` and `AuthEmailToken` Prisma models matching the package's
      `SessionStore` and `EmailTokenStore` interfaces (token hashes only, expiry,
      activity/purpose fields). Do not add `PasswordResetToken` or `RefreshToken`.
- [ ] Run `pnpm db:generate` and `pnpm db:push`; verify both dev and test databases.
- [ ] Update `AGENTS.md` for the package decision, cookie sessions, store contracts,
      and endpoint changes.

## 2. Authentication store

- [ ] Implement `apps/api/src/prisma/prisma-auth.store.ts` for `SessionStore` and
      `EmailTokenStore`.
- [ ] Register both contracts with `AuthenticationStorage.registerSource()`.
- [ ] Use conditional `updateMany`/`deleteMany` with counts for the atomic rules;
      never read-then-write for session deletion/rotation or email-token consumption.
- [ ] Add the package's `authenticationStoreContract()` suite against
      `assessment_test` MongoDB, including the concurrency cases.
- [ ] Verify the `AuthSession`/`AuthEmailToken` data survives an API restart and is
      shared between API instances (no in-memory fallback).

## 3. API foundation

- [ ] Add `apps/api/src/config/env.validation.ts` for `PORT`, `MONGODB_URI`,
      `WEB_ORIGIN`, `APP_URL`, optional `SMTP_URL`, and session lifetimes.
- [ ] Register `ConfigModule.forRoot({ isGlobal: true, validate })`.
- [ ] Add `apps/api/src/prisma/prisma.service.ts` around `getPrismaClient()` with
      shutdown handling.
- [ ] Add `AuthenticationModule.forRootAsync` with session `absoluteTtl`/`idleTtl`,
      `trustedOrigins: [WEB_ORIGIN]`, and the password-reset page URL.
- [ ] Add `UsersRepository` over Prisma: create, find by email/id, credentials,
      update password, mark email verified; never return the hash to routes.
- [ ] Add `CredentialsService` using the package's `PasswordHasher` (scrypt):
      duplicate email → 409, timing-safe verify, generic 401.
- [ ] Add `SessionAuth` (`SessionCookieProvider`) whose `validate()` loads the user;
      register it with the authentication registry.
- [ ] Add `PasswordResetHandler`/mailer using `@nestjs/mail`: `findUser`, `send`,
      `updatePassword`, and `markVerified` (set `User.emailVerified`). Use
      `LogMailTransport` in dev and leave `SmtpTransport` optional. No raw reset
      tokens in responses.
- [ ] Add `AuthController` with `@Public()` signup, signin, forgot-password,
      reset-password, and sign-out. Signup/signin/reset use `SignInService` and return
      the public user.
- [ ] Sign-out uses the package's session handling, clears the cookie, and returns
      204.
- [ ] Add `UsersModule` + `UsersController` with protected `GET /users/me` using
      `@CurrentUser()`; do not add `/auth/me`.
- [ ] Mark the scaffold `GET /` and the auth routes `@Public()`; keep the package's
      global guard on by default.
- [ ] Enable Helmet, credentialed CORS for `WEB_ORIGIN`, and
      `app.enableCsrfProtection()` on Nest 12.1+ with the same trusted origins.
- [ ] Optional: add `@nestjs/throttler` definitions for signin/forgot by IP + account.
- [ ] Keep `PasswordHasher` (scrypt); no argon2/native build dependency.

## 4. API tests

- [ ] Add auth/users e2e specs using the test database and a cookie-preserving
      Supertest agent.
- [ ] Signup: 201 user + `Set-Cookie` HttpOnly/SameSite; no token field; duplicate
      → 409; invalid input → 400.
- [ ] Signin: 200 + cookie; wrong password/unknown email → 401.
- [ ] `/users/me`: cookie → 200; no/invalid/expired cookie → 401; deleted user → 401.
- [ ] Sign-out: 204; cookie cannot be reused.
- [ ] Forgot-password: known and unknown emails both 202 and the same body; no token
      in the response.
- [ ] Reset-password: valid token → 200 + session cookie; old password fails; new
      password signs in; token cannot be reused; invalid/expired → 400.
- [ ] CSRF: cross-origin state-changing request without a trusted origin is rejected.
- [ ] Confirm `/auth/me` is not registered.
- [ ] Clean up test users, sessions, and email tokens; run the store contract suite.
- [ ] Run `docker compose exec api pnpm --filter @repo/api test:e2e`.

## 5. Web foundation

- [ ] Install web dependencies: `@mantine/core`, `@mantine/hooks`,
      `@tanstack/react-query`, `@tanstack/react-router`, `axios`,
      `react-hook-form`, `@hookform/resolvers`, and `zod`.
- [ ] Keep `@repo/contract` as the source of schemas/types.
- [ ] Add `MantineProvider`, one `QueryClient`, and `RouterProvider` in
      `src/main.tsx`; import Mantine styles.
- [ ] Add `src/lib/api.ts`: Axios instance from `VITE_API_URL` with
      `withCredentials: true`; no token interceptor/localStorage.
- [ ] Add `src/auth/` with the `/users/me` query, query keys, and sign-in/out helpers.
      `401` on protected requests clears the cache and redirects; auth form requests
      keep their errors visible.
- [ ] Add code-based TanStack Router routes: `/signup`, `/signin`,
      `/forgot-password`, `/reset-password`, `/app`, and a fallback redirect.
- [ ] Guard `/app` with `beforeLoad`/equivalent, waiting for `/users/me`; redirect
      signed-out users to `/signin` and signed-in users away from auth pages.

## 6. Auth screens

- [ ] Build `/signup` with Mantine inputs + `react-hook-form` and
      `zodResolver(signUpInputSchema)`; fields: email, name, password,
      confirm password; show field errors and server 400/409 errors.
- [ ] Build `/signin` with email/password; generic 401 error; disable submit while
      pending; link to `/forgot-password`; success seeds the user query and goes to
      `/app`.
- [ ] Build `/forgot-password` with email and a generic “if an account exists”
      success state.
- [ ] Build `/reset-password` reading `token` from the query string, with password +
      confirmation, missing/invalid-link handling, and success going to `/app`
      (the API signs the user in).
- [ ] Build `/app` with the exact text `Welcome to the application.`, user details,
      and logout.
- [ ] Logout calls `/auth/sign-out`, clears the token-free auth state/query cache,
      and navigates to `/signin`.
- [ ] Verify no auth token is written to `localStorage`/`sessionStorage`; the cookie
      is httpOnly.
- [ ] Verify forms work with keyboard and visible labels; add a password visibility
      toggle if straightforward.

## 7. Verification and delivery

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] API e2e suite and authentication store contract suite
- [ ] Manual Docker flow: signup → `/app` → reload → sign out; sign in; forgot →
      use the logged reset link → reset (signed in) → `/app`.
- [ ] Confirm the browser stores no token in `localStorage` and the cookie is
      HttpOnly.
- [ ] Update the root `README.md` API table, session notes, env table, and reset
      flow.
- [ ] Update `AGENTS.md` for any changed decisions.
- [ ] Update `AI.md` with the `@nestjs/authentication` decision and corrections.
- [ ] Check no secrets/tokens are committed and `.env` files stay ignored.
- [ ] Optional: add Swagger/OpenAPI docs for the auth endpoints.
- [ ] Optional: add structured request logging and auth rate limiting.

## Definition of done

- [ ] All acceptance criteria in `plan.md` are met.
- [ ] No response exposes `passwordHash`, `confirmPassword`, or raw reset/session
      tokens.
- [ ] Duplicate emails, invalid input, bad credentials, missing sessions, and
      invalid/expired/used reset tokens return the documented statuses and
      `ApiError` shape.
- [ ] `/users/me` is the user info endpoint; `/auth/me` is not registered.
- [ ] The Prisma `SessionStore`/`EmailTokenStore` pass the package contract suite.
- [ ] Web pages work in Docker at http://localhost:5173 against the API at
      http://localhost:3000 with credentialed cookies.
- [ ] Workspace lint, typecheck, tests, and build are green.
