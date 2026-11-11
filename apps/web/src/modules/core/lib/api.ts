import axios, { isAxiosError } from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

/** A 401 from these is a form error (bad credentials, etc.), not a lost session. */
const authFormPaths = new Set([
  '/auth/signup',
  '/auth/signin',
  '/auth/forgot-password',
  '/auth/reset-password',
])

/** Calls `handler` when a protected request returns 401. Returns an unsubscribe function. */
export function onUnauthorized(handler: () => void): () => void {
  const interceptorId = api.interceptors.response.use(
    undefined,
    (error: unknown) => {
      if (
        isAxiosError(error) &&
        error.response?.status === 401 &&
        !authFormPaths.has(error.config?.url ?? '')
      ) {
        handler()
      }

      return Promise.reject(error)
    },
  )

  return () => api.interceptors.response.eject(interceptorId)
}
