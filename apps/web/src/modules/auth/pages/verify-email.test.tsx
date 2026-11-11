import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithRouter } from '../../../test/render-with-router'
import { verifyEmail } from '../lib/auth.api'

import { VerifyEmailForm } from './verify-email'

vi.mock('../lib/auth.api', () => ({
  fetchCurrentUser: vi.fn().mockResolvedValue(null),
  verifyEmail: vi.fn().mockResolvedValue(undefined),
}))

const mockedVerifyEmail = vi.mocked(verifyEmail)

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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('VerifyEmailForm', () => {
  it('posts the token on click and confirms the verification', async () => {
    const user = userEvent.setup()
    await renderWithRouter(<VerifyEmailForm token="abc123" />)

    await user.click(screen.getByRole('button', { name: 'Verify my email' }))

    expect(
      await screen.findByText('Your email address is verified.'),
    ).toBeTruthy()
    expect(mockedVerifyEmail).toHaveBeenCalledTimes(1)
    // TanStack Query passes its own context as the second argument.
    expect(mockedVerifyEmail.mock.calls[0]?.[0]).toEqual({ token: 'abc123' })
    expect(screen.queryByRole('button', { name: 'Verify my email' })).toBeNull()
  })

  it('explains an invalid or expired link', async () => {
    mockedVerifyEmail.mockRejectedValueOnce(
      axiosErrorResponse(400, {
        statusCode: 400,
        message: 'Invalid or expired verification link.',
        error: 'Bad Request',
      }),
    )

    const user = userEvent.setup()
    await renderWithRouter(<VerifyEmailForm token="expired" />)

    await user.click(screen.getByRole('button', { name: 'Verify my email' }))

    expect(await screen.findByText(/invalid or has expired/)).toBeTruthy()
  })

  it('does not spend the token before the click', async () => {
    await renderWithRouter(<VerifyEmailForm token="abc123" />)

    expect(mockedVerifyEmail).not.toHaveBeenCalled()
  })
})
