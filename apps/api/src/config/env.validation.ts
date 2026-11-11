import { z } from 'zod'

const durationSchema = z
  .string()
  .regex(
    /^\d+(?:\.\d+)?(?:ms|s|m|h|d|w)$/,
    'Use a duration such as 30m, 1h, or 7d.',
  )

const optionalUrlSchema = z.preprocess(
  (rawValue) => (rawValue === '' ? undefined : rawValue),
  z.url().optional(),
)

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().max(65_535).default(3000),
  MONGODB_URI: z.string().min(1),
  WEB_ORIGIN: z
    .url()
    .default('http://localhost:5173')
    .transform((url) => new URL(url).origin),
  APP_URL: z
    .url()
    .default('http://localhost:5173')
    .transform((appUrl) => appUrl.replace(/\/+$/, '')),
  SMTP_URL: optionalUrlSchema,
  MAIL_FROM: z.string().min(1).default('Auth Assessment <no-reply@localhost>'),
  SESSION_ABSOLUTE_TTL: durationSchema.default('7d'),
  SESSION_IDLE_TTL: durationSchema.default('1d'),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(config: Record<string, unknown>): Env {
  const validationResult = envSchema.safeParse(config)

  if (!validationResult.success) {
    const validationErrors = validationResult.error.issues
      .map(
        (issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`,
      )
      .join('; ')

    throw new Error(`Invalid environment configuration: ${validationErrors}`)
  }

  return validationResult.data
}
