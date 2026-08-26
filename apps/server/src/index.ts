import { createServer } from 'node:http'
import { createApp } from './app.js'
import { loadConfig } from './config.js'

const config = loadConfig()
const httpServer = createServer(createApp(config))

httpServer.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port}`)
})
