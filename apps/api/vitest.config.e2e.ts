import { defineConfig } from 'vitest/config'

import { testDatabaseUrl } from './vitest.config.js'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: {
      MONGODB_URI: testDatabaseUrl,
      // The suite runs inside the dev Compose container, where
      // SESSION_COOKIE_SECURE=false names the cookie `sid`. Pin the production
      // default so the OpenAPI assertion is deterministic; the auth suite
      // overrides the session options with a non-Secure test cookie anyway.
      SESSION_COOKIE_SECURE: 'true',
    },
    // The store contract clears shared collections between cases; keep the
    // auth suite from running against those collections at the same time.
    fileParallelism: false,
    testTimeout: 15_000,
  },
})
