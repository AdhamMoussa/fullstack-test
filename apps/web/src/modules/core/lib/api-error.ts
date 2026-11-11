import { apiErrorSchema } from '@repo/contract'
import { isAxiosError } from 'axios'

/** The HTTP status of an Axios failure, when there is one. */
export function getApiErrorStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined
}

/** The API's `ApiError.message`, or `fallbackMessage` for anything else. */
export function getApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (!isAxiosError(error)) {
    return fallbackMessage
  }

  const parsedError = apiErrorSchema.safeParse(error.response?.data)

  if (!parsedError.success) {
    return fallbackMessage
  }

  const { message } = parsedError.data

  return Array.isArray(message) ? message.join('\n') : message
}
