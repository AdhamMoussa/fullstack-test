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

- [x] Install API dependencies: `@nestjs/authentication`, `@nestjs/config`,
      `@nestjs/mail`, and `zod` for env validation. Do not add `@nestjs/jwt` or
      argon2.
- [x] Update `AuthResponse` to `{ user: User }` with no `accessToken`; keep the
      signup/signin public-user shape.
- [x] Add `forgotPasswordInputSchema`/`ForgotPasswordInput` and
      `resetPasswordInputSchema`/`ResetPasswordInput` (matching `confirmPassword`).
- [x] Add contract tests for forgot/reset schemas and the token-free auth response.
- [x] Add `emailVerified Boolean @default(false)` to `User`.
- [x] Add `AuthSession` and `AuthEmailToken` Prisma models matching the package's
      `SessionStore` and `EmailTokenStore` interfaces (token hashes only, expiry,
      activity/purpose fields). Do not add `PasswordResetToken` or `RefreshToken`.
- [x] Run `pnpm db:generate` and `pnpm db:push`; verify both dev and test databases.
- [x] Update `AGENTS.md` for the package decision, cookie sessions, store contracts,
      and endpoint changes.

## 2. Authentication store

- [x] Implement `apps/api/src/prisma/prisma-auth.store.ts` for `SessionStore` and
      `EmailTokenStore`.
- [x] Register both contracts with `AuthenticationStorage.registerSource()`.
- [x] Use conditional `updateMany`/`deleteMany` with counts for the atomic rules;
      never read-then-write for session deletion/rotation or email-token consumption.
      Email-token consumption uses a single conditional `delete` (find-and-delete)
      so it both returns the token and stays atomic under concurrency.
- [x] Add the package's `authenticationStoreContract()` suite against
      `assessment_test` MongoDB, including the concurrency cases.
- [x] Verify the `AuthSession`/`AuthEmailToken` data survives an API restart and is
      shared between API instances (no in-memory fallback). The suite reads records
      back through a fresh Prisma client/store instance.

## 3. API foundation

- [x] Add `apps/api/src/config/env.validation.ts` for `PORT`, `MONGODB_URI`,
      `WEB_ORIGIN`, `APP_URL`, optional `SMTP_URL`, and session lifetimes.
- [x] Register `ConfigModule.forRoot({ isGlobal: true, validate })`.
- [x] Add `apps/api/src/prisma/prisma.service.ts` around `getPrismaClient()` with
      shutdown handling.
- [x] Add `AuthenticationModule.forRootAsync` with session `absoluteTtl`/`idleTtl`,
      `trustedOrigins: [WEB_ORIGIN]`, and the password-reset page URL.
- [x] Add `UsersRepository` over Prisma: create, find by email/id, credentials,
      update password, mark email verified; never return the hash to routes.
- [x] Add `CredentialsService` using the package's `PasswordHasher` (scrypt):
      duplicate email → 409, timing-safe verify, generic 401.
- [x] Add `SessionAuth` (`SessionCookieProvider`) whose `validate()` loads the user;
      register it with the authentication registry.
- [x] Add the password-reset mailer using `@nestjs/mail`: `findUser`, `send`,
      `updatePassword`, and an email-verification handler's `markVerified` (sets
      `User.emailVerified`). Use `LogMailTransport` in dev and `SmtpTransport` when
      `SMTP_URL` is set. No raw reset tokens in responses.
- [x] Add `AuthController` with `@Public()` signup, signin, forgot-password,
      reset-password, and sign-out. Signup/signin call `SignInService`; reset uses
      `PasswordResetService` with `signIn: true`. All return the public user where
      applicable.
- [x] Sign-out uses the package's session handling, clears the cookie, and returns 204.
- [x] Add `UsersModule` + `UsersController` with protected `GET /users/me` using
      `@CurrentUser()`; do not add `/auth/me`.
- [x] Mark `GET /health` and the auth routes `@Public()`; keep the package's
      global guard on by default.
- [x] Enable security headers (`app.useSecurityHeaders()`), credentialed CORS for
      `WEB_ORIGIN`, and `app.enableCsrfProtection()` on Nest 12.1+ with the same
      trusted origins. Nest's built-in headers match Helmet 8, so no Helmet
      dependency is needed.
- [x] Keep `PasswordHasher` (scrypt); no argon2/native build dependency.

## 4. API tests

- [x] Add auth/users e2e specs using the test database and a cookie-preserving
      Supertest agent. Tests use an in-memory mail transport and a cheap scrypt cost;
      e2e files run serially so the store contract's cleanup cannot race the auth suite.
- [x] Signup: 201 user + `Set-Cookie` HttpOnly/SameSite; no token field; duplicate
      → 409; invalid input → 400.
- [x] Signin: 200 + cookie; wrong password/unknown email → 401.
- [x] `/users/me`: cookie → 200; no/invalid/expired cookie → 401; deleted user → 401.
- [x] Sign-out: 204; cookie cannot be reused.
- [x] Forgot-password: known and unknown emails both 202 and the same body; no token
      in the response.
- [x] Reset-password: valid token → 200 + session cookie; old password fails; new
      password signs in; token cannot be reused; invalid/expired → 400.
- [x] CSRF: cross-origin state-changing request without a trusted origin is rejected.
- [x] Confirm `/auth/me` is not registered.
- [x] Clean up test users, sessions, and email tokens; run the store contract suite.
- [x] Add `test/openapi.e2e-spec.ts` covering `/docs/json` (paths, contract
      component names, request/response refs, cookie security scheme) and `/docs`.
- [x] Run `docker compose exec api pnpm --filter @repo/api test:e2e` (includes the
      OpenAPI e2e spec).

## 5. Web foundation

- [x] Install web dependencies: `@mantine/core`, `@mantine/hooks`,
      `@tanstack/react-query`, `@tanstack/react-router`, `axios`,
      `react-hook-form`, `@hookform/resolvers`, and `zod`.
- [x] Keep `@repo/contract` as the source of schemas/types.
- [x] Add `MantineProvider`, one `QueryClient`, and `RouterProvider` in
      `src/main.tsx`; import Mantine styles.
- [x] Add `src/modules/core/lib/api.ts`: Axios instance from `VITE_API_URL` with
      `withCredentials: true`; no token interceptor/localStorage.
- [x] Add `src/modules/auth/` with `layouts`, `pages`, `queries`, and `lib`: the
      `/users/me` query, query key, and sign-in/out helpers. `401` on protected
      requests clears the cache and redirects; auth form requests keep their errors
      visible.
- [x] Add TanStack Router file-based routes: `/signup`, `/signin`,
      `/forgot-password`, `/reset-password`, `/app`, and a fallback redirect.
- [x] Guard auth in `beforeLoad` on `_app` (signed-in only, returns
      `{ currentUser }`) and `_auth` (signed-out only, validated `?redirect=`) using
      `ensureQueryData(currentUserQueryOptions)` + `throw redirect()`; router
      `defaultPendingComponent` is the loading view. 401s on protected requests
      call `resetAuthState` (clear cache + `router.invalidate()`). Do not write the
      query cache manually or use `useEffect` for redirects/derived state.

## 6. Auth screens

- [x] Build `/signup` with Mantine inputs + `react-hook-form` and
      `zodResolver(signUpInputSchema)`; fields: email, name, password,
      confirm password; show field errors and server 400/409 errors.
- [x] Build `/signin` with email/password; generic 401 error; disable submit while
      pending; link to `/forgot-password`; success calls `resetAuthState` and the
      `_auth` guard goes to `?redirect=` or `/app`.
- [x] Build `/forgot-password` with email and a generic “if an account exists”
      success state.
- [x] Build `/reset-password` reading `token` from the query string, with password +
      confirmation, missing/invalid-link handling, and success calling
      `resetAuthState` so the guard goes to `/app` (the API signs the user in).
- [x] Build `/app` with the exact text `Welcome to the application.`, user details,
      and logout.
- [x] Logout calls `/auth/sign-out`, then `resetAuthState` (clears the query cache
      and re-runs guards, which redirect to `/signin`).
- [x] Verify no auth token is written to `localStorage`/`sessionStorage`; the cookie
      is httpOnly.
- [x] Verify forms work with keyboard and visible labels; add a password visibility
      toggle if straightforward.

## 7. Verification and delivery

- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] API e2e suite and authentication store contract suite
- [x] Manual Docker flow: signup → `/app` → reload → sign out; sign in; forgot →
      use the logged reset link → reset (signed in) → `/app`.
- [x] Confirm the browser stores no token in `localStorage` and the cookie is
      HttpOnly.
- [x] Update the root `README.md` API table, session notes, env table, and reset
      flow.
- [x] Update `AGENTS.md` for any changed decisions.
- [x] Update `AI.md` with the `@nestjs/authentication` decision and corrections.
- [x] Check no secrets/tokens are committed and `.env` files stay ignored.
- [x] Optional: add Swagger/OpenAPI docs for the auth endpoints (`/docs`,
      `/docs/json`).
- [x] Optional: add structured request logging.

## Definition of done

- [x] All acceptance criteria in `plan.md` are met.
- [x] No response exposes `passwordHash`, `confirmPassword`, or raw reset/session
      tokens.
- [x] Duplicate emails, invalid input, bad credentials, missing sessions, and
      invalid/expired/used reset tokens return the documented statuses and
      `ApiError` shape.
- [x] `/users/me` is the user info endpoint; `/auth/me` is not registered.
- [x] The Prisma `SessionStore`/`EmailTokenStore` pass the package contract suite.
- [x] Web pages work in Docker at http://localhost:5173 against the API at
      http://localhost:3000 with credentialed cookies.
- [x] Workspace lint, typecheck, tests, and build are green.
