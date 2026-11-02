import react from '@vitejs/plugin-react'
import { defaultClientConditions, defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // The live demo is served from /react-realtime-chat/ (see `npm run build:cf`; BASE_PATH also works).
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  resolve: {
    // Consume @chat/shared from its TypeScript sources, no prebuild step needed.
    conditions: ['source', ...defaultClientConditions],
  },
  server: { port: 5173 },
})
