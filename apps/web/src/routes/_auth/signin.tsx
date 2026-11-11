import { createFileRoute } from '@tanstack/react-router'

import { SigninPage } from '../../modules/auth/pages/signin'

export const Route = createFileRoute('/_auth/signin')({
  component: SigninPage,
})
