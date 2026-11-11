import { describe, expect, it } from 'vitest'

import { authSearchSchema, linkTokenSearchSchema } from './auth-search'

describe('authSearchSchema', () => {
  it('keeps a same-origin redirect path', () => {
    expect(authSearchSchema.parse({ redirect: '/app?tab=1' })).toEqual({
      redirect: '/app?tab=1',
    })
  })

  it.each(['//evil.com', '/\\evil.com', 42])(
    'drops the unsafe redirect %s',
    (redirect) => {
      expect(authSearchSchema.parse({ redirect }).redirect).toBeUndefined()
    },
  )
})

describe('linkTokenSearchSchema', () => {
  it('keeps a trimmed token', () => {
    expect(linkTokenSearchSchema.parse({ token: ' abc123 ' })).toEqual({
      token: 'abc123',
    })
  })

  it('drops a missing or empty token', () => {
    expect(linkTokenSearchSchema.parse({}).token).toBeUndefined()
    expect(linkTokenSearchSchema.parse({ token: '   ' }).token).toBeUndefined()
  })
})
