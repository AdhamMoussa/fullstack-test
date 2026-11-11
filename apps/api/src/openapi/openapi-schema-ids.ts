import {
  apiErrorSchema,
  authResponseSchema,
  forgotPasswordInputSchema,
  resetPasswordInputSchema,
  signInInputSchema,
  signUpInputSchema,
  userSchema,
  verifyEmailInputSchema,
} from '@repo/contract'
import { z } from 'zod'

const contractSchemasWithIds = [
  {
    schema: signUpInputSchema,
    id: 'SignUpInput',
    description: 'Signup request body, including the password confirmation.',
  },
  {
    schema: signInInputSchema,
    id: 'SignInInput',
    description: 'Signin request body with the email and password.',
  },
  {
    schema: forgotPasswordInputSchema,
    id: 'ForgotPasswordInput',
    description: 'Password-reset request body with the account email.',
  },
  {
    schema: resetPasswordInputSchema,
    id: 'ResetPasswordInput',
    description:
      'Reset request body with the single-use token and the new password.',
  },
  {
    schema: verifyEmailInputSchema,
    id: 'VerifyEmailInput',
    description:
      'Email-verification request body with the single-use token from the link.',
  },
  {
    schema: userSchema,
    id: 'User',
    description: 'Public user; never includes password data.',
  },
  {
    schema: authResponseSchema,
    id: 'AuthResponse',
    description:
      'The signed-in user; the session travels in the httpOnly session cookie (`__Host-sid`, or `sid` when `SESSION_COOKIE_SECURE=false`), never in the body.',
  },
  {
    schema: apiErrorSchema,
    id: 'ApiError',
    description:
      'Error body; for validation errors `message` is a list such as "email: Invalid email address".',
  },
] as const

/**
 * Names the contract schemas for the OpenAPI document. Runs API-side so
 * `@repo/contract` stays free of registry ids: Vite HMR re-evaluates the
 * contract in the browser, and re-adding an id would throw.
 */
export function registerOpenApiSchemaIds(): void {
  for (const { schema, id, description } of contractSchemasWithIds) {
    if (!z.globalRegistry.has(schema)) {
      z.globalRegistry.add(schema, { id, description })
    }
  }
}
