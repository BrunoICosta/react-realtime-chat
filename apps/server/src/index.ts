import { loadConfig } from './config.js'
import { createChatServer } from './server.js'

try {
  // Optional local overrides (see .env.example). Real deployments set env vars directly.
  process.loadEnvFile()
} catch {
  // No .env file: keep the process environment as is.
}

const config = loadConfig()
const server = createChatServer(config)

const port = await server.listen()
console.log(`[server] listening on http://localhost:${port} (${config.env})`)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    console.log(`[server] ${signal} received, shutting down`)
    void server.close().then(() => process.exit(0))
  })
}
