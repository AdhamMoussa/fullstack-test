import { describe, expect, it } from 'vitest'

import { sessionCookieName } from './session-cookie.js'

describe('sessionCookieName', () => {
  it('uses the __Host- prefix when the cookie is Secure', () => {
    expect(sessionCookieName(true)).toBe('__Host-sid')
  })

  it('drops the prefix when the cookie is not Secure', () => {
    expect(sessionCookieName(false)).toBe('sid')
  })
})
