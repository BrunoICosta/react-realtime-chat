import { createServer } from 'node:http'
import { createApp } from './app.js'
import { createTokenService } from './auth/token.js'
import { loadConfig } from './config.js'

const config = loadConfig()
const tokens = createTokenService(config.jwtSecret, config.jwtExpiresInSeconds)
const httpServer = createServer(createApp({ config, tokens, isNicknameTaken: () => false }))

httpServer.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port}`)
})
