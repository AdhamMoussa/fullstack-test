import type { AuthResponse, User, SignInInput } from '@repo/contract'

import { api } from '../../core/lib/api'

/**
 * Signed-out is an expected state, not an error: a 401 resolves to `null`
 * without going through the global unauthorized handler.
 */
export async function fetchCurrentUser(): Promise<User | null> {
  const response = await api.get<User>('/users/me', {
    validateStatus: (status) => status === 200 || status === 401,
  })

  return response.status === 401 ? null : response.data
}

export async function signIn(credentials: SignInInput): Promise<User> {
  const response = await api.post<AuthResponse>('/auth/signin', credentials)

  return response.data.user
}

export async function signOut(): Promise<void> {
  await api.post('/auth/sign-out')
}
