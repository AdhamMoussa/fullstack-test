import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import {
  requestPasswordReset,
  resetPassword,
  signIn,
  signOut,
  signUp,
} from '../lib/auth.api'
import { resetAuthState } from '../lib/auth-session'

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
