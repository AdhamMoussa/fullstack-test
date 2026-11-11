import { defineConfig } from 'vitest/config'

import { testDatabaseUrl } from './vitest.config.js'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: { MONGODB_URI: testDatabaseUrl },
    // The store contract clears shared collections between cases; keep the
    // auth suite from running against those collections at the same time.
    fileParallelism: false,
    testTimeout: 15_000,
  },
})
