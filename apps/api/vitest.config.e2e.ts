import { defineConfig } from 'vitest/config'

import { testDatabaseUrl } from './vitest.config.js'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: { MONGODB_URI: testDatabaseUrl },
  },
})
