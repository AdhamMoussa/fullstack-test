import { z } from 'zod'

/** Only same-origin paths: rejects `//evil.com` and `/\evil.com` open redirects. */
const internalPathSchema = z
  .string()
  .refine((path) => path.startsWith('/') && !/^\/[/\\]/.test(path))

export const authSearchSchema = z.object({
  redirect: internalPathSchema.optional().catch(undefined),
})

/** The optional `token` carried by reset and email-verification links. */
export const linkTokenSearchSchema = z.object({
  token: z.string().trim().min(1).optional().catch(undefined),
})
