import { createFileRoute } from '@tanstack/react-router'

import { ResetPasswordPage } from '../../modules/auth/pages/reset-password'

export const Route = createFileRoute('/_auth/reset-password')({
  component: ResetPasswordPage,
})
