import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'

import { getApiErrorMessage, getApiErrorStatus } from './api-error'

const fallbackMessage = 'Something went wrong. Please try again.'

/** The shape Axios hands to a `catch` block for an HTTP error response. */
function axiosErrorResponse(status: number, data: unknown) {
  return new AxiosError(
    'Request failed with status code ' + status,
    'ERR_BAD_RESPONSE',
    undefined,
    undefined,
    {
      data,
      status,
      statusText: '',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    },
  )
}

describe('getApiErrorStatus', () => {
  it('returns the HTTP status of an Axios error', () => {
    expect(getApiErrorStatus(axiosErrorResponse(409, {}))).toBe(409)
  })

  it('returns undefined for errors without a response', () => {
    expect(getApiErrorStatus(new AxiosError('Network Error'))).toBeUndefined()
    expect(getApiErrorStatus(new Error('boom'))).toBeUndefined()
  })
})

describe('getApiErrorMessage', () => {
  it('returns the contract ApiError message', () => {
    const error = axiosErrorResponse(409, {
      statusCode: 409,
      message: 'An account with this email already exists.',
      error: 'Conflict',
    })

    expect(getApiErrorMessage(error, fallbackMessage)).toBe(
      'An account with this email already exists.',
    )
  })

  it('joins an array of validation messages with newlines', () => {
    const error = axiosErrorResponse(400, {
      statusCode: 400,
      message: ['email must be an email', 'name is too short'],
      error: 'Bad Request',
    })

    expect(getApiErrorMessage(error, fallbackMessage)).toBe(
      'email must be an email\nname is too short',
    )
  })

  it('falls back for non-Axios errors', () => {
    expect(getApiErrorMessage(new Error('boom'), fallbackMessage)).toBe(
      fallbackMessage,
    )
  })

  it('falls back for a malformed error body', () => {
    const error = axiosErrorResponse(500, { unexpected: 'body' })

    expect(getApiErrorMessage(error, fallbackMessage)).toBe(fallbackMessage)
  })
})
