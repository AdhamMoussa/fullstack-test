import { createFileRoute } from '@tanstack/react-router'

import { resetPasswordSearchSchema } from '../../modules/auth/lib/auth-search'
import { ResetPasswordPage } from '../../modules/auth/pages/reset-password'

export const Route = createFileRoute('/_auth/reset-password')({
  validateSearch: resetPasswordSearchSchema,
  component: ResetPasswordPage,
})
