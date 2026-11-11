import type { QueryClient } from '@tanstack/react-query'
import type { AnyRouter } from '@tanstack/react-router'

/**
 * Call after the session changes (sign-in, sign-out, or an unexpected 401).
 * Drops all user-scoped query data, then re-runs the active route guards,
 * which refetch `/users/me` and redirect to the right place.
 */
export async function resetAuthState(
  queryClient: QueryClient,
  router: AnyRouter,
): Promise<void> {
  queryClient.clear()
  await router.invalidate()
}
