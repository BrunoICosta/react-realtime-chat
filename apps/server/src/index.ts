import { loadConfig } from './config.js'
import { createChatServer } from './server.js'

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
