import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithRouter } from '../../../test/render-with-router'
import { sendVerificationEmail } from '../lib/auth.api'

import { EmailVerificationBanner } from './email-verification-banner'

vi.mock('../lib/auth.api', () => ({
  fetchCurrentUser: vi.fn().mockResolvedValue(null),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}))

const mockedSendVerificationEmail = vi.mocked(sendVerificationEmail)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('EmailVerificationBanner', () => {
  it('shows the address and sends a new link on click', async () => {
    const user = userEvent.setup()
    await renderWithRouter(
      <EmailVerificationBanner email="new.user@example.com" />,
    )

    expect(screen.getByText(/new\.user@example\.com/)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Send a new link' }))

    expect(
      await screen.findByText(
        'A new link is on its way. It expires in 24 hours.',
      ),
    ).toBeTruthy()
    expect(mockedSendVerificationEmail).toHaveBeenCalledTimes(1)
  })
})
