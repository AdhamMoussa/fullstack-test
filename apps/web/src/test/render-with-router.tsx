import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'

/**
 * Renders `ui` at `/` with the providers the screens expect. The stub routes
 * mirror the app's real paths so `AnchorLink` can resolve its `to` targets.
 */
export async function renderWithRouter(ui: ReactNode) {
  const rootRoute = createRootRoute({ component: () => ui })

  const router = createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/signin',
        component: () => null,
      }),
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/signup',
        component: () => null,
      }),
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/forgot-password',
        component: () => null,
      }),
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/reset-password',
        component: () => null,
      }),
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/app',
        component: () => null,
      }),
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const result = render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>,
  )

  // The router mounts its first match synchronously once the initial load settles,
  // so the returned queries can use `getBy*` on the first render.
  await router.load()

  return result
}
