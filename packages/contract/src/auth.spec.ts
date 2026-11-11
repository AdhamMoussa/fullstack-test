import { describe, expect, it } from 'vitest'

import {
  forgotPasswordInputSchema,
  resetPasswordInputSchema,
  signInInputSchema,
  signUpInputSchema,
} from './auth.js'

const valid = {
  email: 'User@Example.COM ',
  name: 'Ada',
  password: 'Passw0rd!',
  confirmPassword: 'Passw0rd!',
}

const validReset = {
  token: 'reset-token',
  password: 'NewPassw0rd!',
  confirmPassword: 'NewPassw0rd!',
}

describe('signUpInputSchema', () => {
  it('accepts valid input and normalizes the email', () => {
    expect(signUpInputSchema.parse(valid)).toMatchObject({
      email: 'user@example.com',
      name: 'Ada',
    })
  })

  it.each([
    ['invalid email', { email: 'no-at-sign' }],
    ['short name', { name: 'Al' }],
    ['short password', { password: 'P0!' }],
    ['password without a letter', { password: '12345678!' }],
    ['password without a number', { password: 'Password!' }],
    ['password without a special character', { password: 'Password1' }],
  ])('rejects %s', (_label, patch) => {
    expect(signUpInputSchema.safeParse({ ...valid, ...patch }).success).toBe(
      false,
    )
  })

  it('rejects mismatched password confirmation', () => {
    const result = signUpInputSchema.safeParse({
      ...valid,
      confirmPassword: 'Different1!',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ['confirmPassword'],
        message: 'Passwords do not match.',
      }),
    )
  })

  it('rejects a missing password confirmation', () => {
    const { confirmPassword: _confirmPassword, ...withoutConfirmation } = valid

    expect(signUpInputSchema.safeParse(withoutConfirmation).success).toBe(false)
  })

  it('rejects unknown fields', () => {
    expect(
      signUpInputSchema.safeParse({ ...valid, role: 'admin' }).success,
    ).toBe(false)
  })
})

describe('signInInputSchema', () => {
  it('requires a password but does not apply the signup policy', () => {
    expect(
      signInInputSchema.safeParse({ email: 'a@b.co', password: 'x' }).success,
    ).toBe(true)
    expect(
      signInInputSchema.safeParse({ email: 'a@b.co', password: '' }).success,
    ).toBe(false)
  })
})

describe('forgotPasswordInputSchema', () => {
  it('normalizes a valid email', () => {
    expect(
      forgotPasswordInputSchema.parse({ email: 'User@Example.COM ' }),
    ).toEqual({ email: 'user@example.com' })
  })

  it('rejects an invalid email', () => {
    expect(forgotPasswordInputSchema.safeParse({ email: 'nope' }).success).toBe(
      false,
    )
  })
})

describe('resetPasswordInputSchema', () => {
  it('accepts a valid token and password confirmation', () => {
    expect(resetPasswordInputSchema.parse(validReset)).toEqual(validReset)
  })

  it('rejects a mismatched password confirmation', () => {
    const result = resetPasswordInputSchema.safeParse({
      ...validReset,
      confirmPassword: 'Different1!',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ['confirmPassword'],
        message: 'Passwords do not match.',
      }),
    )
  })

  it('rejects a missing token', () => {
    const { token: _token, ...withoutToken } = validReset

    expect(resetPasswordInputSchema.safeParse(withoutToken).success).toBe(false)
  })

  it('applies the signup password policy', () => {
    expect(
      resetPasswordInputSchema.safeParse({
        ...validReset,
        password: 'weak',
        confirmPassword: 'weak',
      }).success,
    ).toBe(false)
  })
})
