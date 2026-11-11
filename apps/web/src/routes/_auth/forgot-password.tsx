import { createFileRoute } from '@tanstack/react-router'

import { ForgotPasswordPage } from '../../modules/auth/pages/forgot-password'

export const Route = createFileRoute('/_auth/forgot-password')({
  component: ForgotPasswordPage,
})
