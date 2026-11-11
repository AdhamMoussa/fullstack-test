import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/** Unmount rendered trees between tests (Vitest globals are off). */
afterEach(cleanup)

/**
 * jsdom has no `window.matchMedia`; Mantine reads it for the color scheme.
 * Keep this stub in the shared setup so every component test can render.
 */
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList
}

/** The router restores scroll position; jsdom logs a "not implemented" error. */
window.scrollTo = () => undefined
