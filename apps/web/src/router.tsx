import { createRouter } from '@tanstack/react-router'

import { resetAuthState } from './modules/auth/lib/auth-session'
import { LoadingScreen } from './modules/core/components/loading-screen'
import { onUnauthorized } from './modules/core/lib/api'
import { queryClient } from './modules/core/lib/query-client'
import { routeTree } from './routeTree.gen'

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPendingComponent: LoadingScreen,
})

const stopUnauthorizedHandler = onUnauthorized(() => {
  void resetAuthState(queryClient, router)
})

import.meta.hot?.dispose(stopUnauthorizedHandler)

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
