import { describe, expect, it } from 'vitest'

import {
  forgotPasswordInputSchema,
  resetPasswordInputSchema,
  signInInputSchema,
  signUpInputSchema,
  verifyEmailInputSchema,
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

const maxLengthEmail = `${'a'.repeat(242)}@example.com`
const overlongEmail = `${'a'.repeat(243)}@example.com`
const maxLengthPassword = `P${'a'.repeat(125)}0!`
const overlongPassword = `P${'a'.repeat(126)}0!`

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

  it('accepts an email of exactly 254 characters', () => {
    expect(maxLengthEmail).toHaveLength(254)
    expect(
      signUpInputSchema.safeParse({ ...valid, email: maxLengthEmail }).success,
    ).toBe(true)
  })

  it('rejects an email longer than 254 characters', () => {
    expect(overlongEmail).toHaveLength(255)

    const result = signUpInputSchema.safeParse({
      ...valid,
      email: overlongEmail,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ['email'],
        message: 'Email must be at most 254 characters.',
      }),
    )
  })

  it('rejects a name longer than 100 characters', () => {
    expect(
      signUpInputSchema.safeParse({ ...valid, name: 'A'.repeat(101) }).success,
    ).toBe(false)
  })

  it('accepts a password of 128 characters and rejects 129', () => {
    expect(maxLengthPassword).toHaveLength(128)
    expect(
      signUpInputSchema.safeParse({
        ...valid,
        password: maxLengthPassword,
        confirmPassword: maxLengthPassword,
      }).success,
    ).toBe(true)

    const result = signUpInputSchema.safeParse({
      ...valid,
      password: overlongPassword,
      confirmPassword: overlongPassword,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ['password'],
        message: 'Password must be at most 128 characters.',
      }),
    )
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

  it('accepts a password of 128 characters and rejects 129', () => {
    expect(
      signInInputSchema.safeParse({
        email: 'a@b.co',
        password: 'x'.repeat(128),
      }).success,
    ).toBe(true)

    const result = signInInputSchema.safeParse({
      email: 'a@b.co',
      password: 'x'.repeat(129),
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ['password'],
        message: 'Password must be at most 128 characters.',
      }),
    )
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

  it('accepts a password of 128 characters and rejects 129', () => {
    expect(
      resetPasswordInputSchema.safeParse({
        ...validReset,
        password: maxLengthPassword,
        confirmPassword: maxLengthPassword,
      }).success,
    ).toBe(true)

    const result = resetPasswordInputSchema.safeParse({
      ...validReset,
      password: overlongPassword,
      confirmPassword: overlongPassword,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ['password'],
        message: 'Password must be at most 128 characters.',
      }),
    )
  })
})

describe('verifyEmailInputSchema', () => {
  it('accepts a token and trims it', () => {
    expect(verifyEmailInputSchema.parse({ token: '  verify-token  ' })).toEqual(
      {
        token: 'verify-token',
      },
    )
  })

  it.each([
    ['an empty token', ''],
    ['a whitespace-only token', '   '],
  ])('rejects %s', (_label, token) => {
    const result = verifyEmailInputSchema.safeParse({ token })

    expect(result.success).toBe(false)
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ['token'],
        message: 'Verification token is required.',
      }),
    )
  })

  it('rejects unknown fields', () => {
    expect(
      verifyEmailInputSchema.safeParse({
        token: 'verify-token',
        email: 'a@b.co',
      }).success,
    ).toBe(false)
  })
})
