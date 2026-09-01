import react from '@vitejs/plugin-react'
import { defaultClientConditions, defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the app from /react-realtime-chat/ (set by the deploy workflow).
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  resolve: {
    // Consume @chat/shared from its TypeScript sources, no prebuild step needed.
    conditions: ['source', ...defaultClientConditions],
  },
  server: { port: 5173 },
})
