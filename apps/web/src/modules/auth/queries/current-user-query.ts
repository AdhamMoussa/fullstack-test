import { queryOptions } from '@tanstack/react-query'

import { fetchCurrentUser } from '../lib/auth.api'

export const authQueryKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authQueryKeys.all, 'current-user'] as const,
}

/**
 * Resolves to the signed-in user, or `null` when there is no session.
 * Route guards read it with `ensureQueryData`, so it is fetched once and shared.
 */
export const currentUserQueryOptions = queryOptions({
  queryKey: authQueryKeys.currentUser(),
  queryFn: fetchCurrentUser,
})
