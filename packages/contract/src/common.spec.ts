import { describe, expect, it } from 'vitest'

import { authResponseSchema } from './common.js'

const user = {
  id: 'user-id',
  email: 'ada@example.com',
  name: 'Ada',
  emailVerified: false,
  createdAt: '2026-11-11T00:00:00.000Z',
  updatedAt: '2026-11-11T00:00:00.000Z',
}

describe('authResponseSchema', () => {
  it('contains the public user and no token', () => {
    const parsed = authResponseSchema.parse({
      user,
      accessToken: 'legacy-token',
    })

    expect(parsed).toEqual({ user })
    expect(parsed).not.toHaveProperty('accessToken')
  })

  it('rejects a user without the required public fields', () => {
    expect(authResponseSchema.safeParse({ user: { id: 'x' } }).success).toBe(
      false,
    )
  })
})
