import { z } from 'zod'

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email())

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.')
  .regex(
    /[^A-Za-z0-9\s]/,
    'Password must contain at least one special character.',
  )

export const signUpInputSchema = z
  .strictObject({
    email: emailSchema,
    name: z.string().trim().min(3, 'Name must be at least 3 characters.'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    error: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export const signInInputSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
})

export const forgotPasswordInputSchema = z.strictObject({
  email: emailSchema,
})

export const resetPasswordInputSchema = z
  .strictObject({
    token: z.string().trim().min(1, 'Reset token is required.'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    error: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export type SignUpInput = z.infer<typeof signUpInputSchema>
export type SignInInput = z.infer<typeof signInInputSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>
