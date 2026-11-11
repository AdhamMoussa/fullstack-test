import type { User } from '@repo/contract'
import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'

import { currentUserQueryOptions } from '../queries/current-user-query'

export const signedInHomePath = '/app'

/** For `beforeLoad` on protected layouts: returns the user or redirects to `/signin`. */
export async function requireSignedInUser(
  queryClient: QueryClient,
  returnTo: string,
): Promise<User> {
  const currentUser = await queryClient.ensureQueryData({
    ...currentUserQueryOptions,
    revalidateIfStale: true,
  })

  if (!currentUser) {
    throw redirect({
      to: '/signin',
      search: { redirect: returnTo },
      replace: true,
    })
  }

  return currentUser
}

/** For `beforeLoad` on guest-only layouts: sends signed-in users to `redirectTo` or `/app`. */
export async function requireSignedOutUser(
  queryClient: QueryClient,
  redirectTo: string | undefined,
): Promise<void> {
  const currentUser = await queryClient.ensureQueryData(currentUserQueryOptions)

  if (currentUser) {
    throw redirect({ to: redirectTo ?? signedInHomePath, replace: true })
  }
}
