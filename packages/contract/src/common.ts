import { z } from 'zod'

/** The JSON shape returned over HTTP. Never includes Prisma-only fields. */
export const userSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  name: z.string().min(3),
  emailVerified: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export const authResponseSchema = z.object({
  user: userSchema,
})

export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string().optional(),
})

export type PublicUser = z.infer<typeof userSchema>
export type AuthResponse = z.infer<typeof authResponseSchema>
export type ApiError = z.infer<typeof apiErrorSchema>
