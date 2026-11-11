import { describe, expect, it } from 'vitest'

import { validateEnv } from './env.validation.js'

const minimalEnv = { MONGODB_URI: 'mongodb://127.0.0.1:27017/assessment' }

describe('validateEnv', () => {
  it('defaults SESSION_COOKIE_SECURE to true', () => {
    expect(validateEnv(minimalEnv).SESSION_COOKIE_SECURE).toBe(true)
  })

  it('parses the explicit string values', () => {
    const insecureEnv = validateEnv({
      ...minimalEnv,
      SESSION_COOKIE_SECURE: 'false',
    })
    const secureEnv = validateEnv({
      ...minimalEnv,
      SESSION_COOKIE_SECURE: 'true',
    })

    expect(insecureEnv.SESSION_COOKIE_SECURE).toBe(false)
    expect(secureEnv.SESSION_COOKIE_SECURE).toBe(true)
  })

  it('rejects values other than true or false', () => {
    expect(() =>
      validateEnv({ ...minimalEnv, SESSION_COOKIE_SECURE: 'yes' }),
    ).toThrow(/SESSION_COOKIE_SECURE/)
  })
})
