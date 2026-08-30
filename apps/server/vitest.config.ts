import { defaultServerConditions } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Resolve `@chat/shared` straight from its TypeScript sources (no build needed).
  ssr: { resolve: { conditions: ['source', ...defaultServerConditions] } },
  resolve: { conditions: ['source', ...defaultServerConditions] },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    testTimeout: 10_000,
  },
})
