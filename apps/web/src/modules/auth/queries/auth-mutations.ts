import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import {
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  signIn,
  signOut,
  signUp,
  verifyEmail,
} from '../lib/auth.api'
import { resetAuthState } from '../lib/auth-session'
import { authQueryKeys } from './current-user-query'

/** Clears user-scoped queries and re-runs the route guards after a session change. */
function useResetAuthState() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return () => resetAuthState(queryClient, router)
}

export function useSignUpMutation() {
  const resetSessionState = useResetAuthState()

  return useMutation({
    mutationFn: signUp,
    onSuccess: () => resetSessionState(),
  })
}

export function useSignInMutation() {
  const resetSessionState = useResetAuthState()

  return useMutation({
    mutationFn: signIn,
    onSuccess: () => resetSessionState(),
  })
}

export function useResetPasswordMutation() {
  const resetSessionState = useResetAuthState()

  return useMutation({
    mutationFn: resetPassword,
    onSuccess: () => resetSessionState(),
  })
}

export function useSignOutMutation() {
  const resetSessionState = useResetAuthState()

  return useMutation({
    mutationFn: signOut,
    onSuccess: () => resetSessionState(),
  })
}

export function useRequestPasswordResetMutation() {
  return useMutation({
    mutationFn: requestPasswordReset,
  })
}

export function useVerifyEmailMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: verifyEmail,
    // The link can be opened while signed in, so refresh `emailVerified` before
    // the success state shows. The session itself did not change. On this page
    // nothing observes the current-user query (the guards use `ensureQueryData`,
    // not a hook), so a plain invalidation would only mark it stale and the
    // `_app` guard would reuse the stale banner data; `refetchType: 'all'`
    // refetches inactive queries too.
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: authQueryKeys.currentUser(),
        refetchType: 'all',
      }),
  })
}

export function useSendVerificationEmailMutation() {
  return useMutation({
    mutationFn: sendVerificationEmail,
  })
}
