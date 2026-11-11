import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Also reads VITE_* from process.env, so Compose can supply it.
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  if (!env.VITE_API_URL) {
    throw new Error(
      'VITE_API_URL is required (the API origin, e.g. http://localhost:3000). Set it in the environment or apps/web/.env.',
    )
  }

  return {
    plugins: [
      tanstackRouter({ target: 'react' }),
      react(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
    },
  }
})
