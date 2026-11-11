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
