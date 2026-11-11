import { describe, expect, it } from 'vitest'

import { authSearchSchema } from './auth-search'

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
