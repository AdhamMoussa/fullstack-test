import { createFileRoute } from '@tanstack/react-router'

import { authSearchSchema } from '../modules/auth/lib/auth-search'
import { requireSignedOutUser } from '../modules/auth/lib/route-guards'
import { AuthLayout } from '../modules/auth/layouts/auth-layout'

export const Route = createFileRoute('/_auth')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ context, search }) =>
    requireSignedOutUser(context.queryClient, search.redirect),
  component: AuthLayout,
})
