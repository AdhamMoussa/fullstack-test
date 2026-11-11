import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithRouter } from '../../../test/render-with-router'
import { requestPasswordReset } from '../lib/auth.api'

import { ForgotPasswordPage } from './forgot-password'

vi.mock('../lib/auth.api', () => ({
  fetchCurrentUser: vi.fn().mockResolvedValue(null),
  requestPasswordReset: vi.fn().mockResolvedValue(undefined),
}))

const mockedRequestPasswordReset = vi.mocked(requestPasswordReset)

describe('ForgotPasswordPage', () => {
  it('confirms the request and replaces the form', async () => {
    const user = userEvent.setup()
    await renderWithRouter(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText(/^Email/), 'new.user@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByText('Check your email')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Send reset link' })).toBeNull()
    expect(mockedRequestPasswordReset).toHaveBeenCalledTimes(1)
    // TanStack Query passes its own context as the second argument.
    expect(mockedRequestPasswordReset.mock.calls[0]?.[0]).toEqual({
      email: 'new.user@example.com',
    })
  })
})
