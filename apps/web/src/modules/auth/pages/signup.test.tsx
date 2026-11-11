import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithRouter } from '../../../test/render-with-router'
import { signUp } from '../lib/auth.api'
import { resetAuthState } from '../lib/auth-session'

import { SignupPage } from './signup'

vi.mock('../lib/auth.api', () => ({
  fetchCurrentUser: vi.fn().mockResolvedValue(null),
  signUp: vi.fn().mockResolvedValue({
    id: '2f8f8a0c9b1e4d6f8a0b2c4d',
    email: 'new.user@example.com',
    name: 'New User',
    emailVerified: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }),
}))

vi.mock('../lib/auth-session', () => ({
  resetAuthState: vi.fn().mockResolvedValue(undefined),
}))

const mockedSignUp = vi.mocked(signUp)
const mockedResetAuthState = vi.mocked(resetAuthState)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SignupPage', () => {
  it('shows the validation messages for an empty submit', async () => {
    const user = userEvent.setup()
    await renderWithRouter(<SignupPage />)

    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Invalid email address')).toBeTruthy()
    expect(
      await screen.findByText('Name must be at least 3 characters.'),
    ).toBeTruthy()
    expect(
      await screen.findByText('Password must be at least 8 characters.'),
    ).toBeTruthy()
    expect(
      screen.getByLabelText(/^Password/).getAttribute('aria-invalid'),
    ).toBe('true')
    expect(mockedSignUp).not.toHaveBeenCalled()
  })

  it('reports mismatched passwords without signing up', async () => {
    const user = userEvent.setup()
    await renderWithRouter(<SignupPage />)

    await user.type(screen.getByLabelText(/^Email/), 'new.user@example.com')
    await user.type(screen.getByLabelText(/^Name/), 'New User')
    await user.type(screen.getByLabelText(/^Password/), 'Passw0rd!')
    await user.type(screen.getByLabelText(/^Confirm password/), 'Passw0rd?')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Passwords do not match.')).toBeTruthy()
    expect(mockedSignUp).not.toHaveBeenCalled()
  })

  it('signs up with normalized values and resets the auth state', async () => {
    const user = userEvent.setup()
    await renderWithRouter(<SignupPage />)

    await user.type(screen.getByLabelText(/^Email/), '  New.User@Example.com ')
    await user.type(screen.getByLabelText(/^Name/), 'New User')
    await user.type(screen.getByLabelText(/^Password/), 'Passw0rd!')
    await user.type(screen.getByLabelText(/^Confirm password/), 'Passw0rd!')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(mockedSignUp).toHaveBeenCalledTimes(1))
    // TanStack Query passes its own context as the second argument.
    expect(mockedSignUp.mock.calls[0]?.[0]).toEqual({
      email: 'new.user@example.com',
      name: 'New User',
      password: 'Passw0rd!',
      confirmPassword: 'Passw0rd!',
    })
    await waitFor(() => expect(mockedResetAuthState).toHaveBeenCalledTimes(1))
  })
})
