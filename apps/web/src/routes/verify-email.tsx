import { createFileRoute } from '@tanstack/react-router'

import { linkTokenSearchSchema } from '../modules/auth/lib/auth-search'
import { VerifyEmailPage } from '../modules/auth/pages/verify-email'

export const Route = createFileRoute('/verify-email')({
  validateSearch: linkTokenSearchSchema,
  component: VerifyEmailPage,
})
