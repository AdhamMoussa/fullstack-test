import { createFileRoute } from '@tanstack/react-router'

import { requireSignedInUser } from '../modules/auth/lib/route-guards'
import { AppLayout } from '../modules/core/layouts/app-layout'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => ({
    currentUser: await requireSignedInUser(context.queryClient, location.href),
  }),
  component: AppLayout,
})
