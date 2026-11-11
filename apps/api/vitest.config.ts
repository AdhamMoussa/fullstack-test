import { defineConfig } from 'vitest/config'

// Tests never touch the dev database. Compose sets MONGODB_TEST_URI; the
// fallback is for host runs against the published Mongo port.
export const testDatabaseUrl =
  process.env.MONGODB_TEST_URI ??
  'mongodb://127.0.0.1:27017/assessment_test?replicaSet=rs0&directConnection=true'

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    env: { MONGODB_URI: testDatabaseUrl },
  },
})
