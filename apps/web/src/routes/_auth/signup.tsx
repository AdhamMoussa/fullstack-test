import { createFileRoute } from '@tanstack/react-router'

import { SignupPage } from '../../modules/auth/pages/signup'

export const Route = createFileRoute('/_auth/signup')({
  component: SignupPage,
})
