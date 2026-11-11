import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node26',
  clean: false,
  dts: true,
  sourcemap: true,
  splitting: false,
  external: [/^@prisma\/client/, /generated\/prisma/, '@prisma/engines'],
})
