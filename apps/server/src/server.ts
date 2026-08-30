import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp } from './app.js'
import { createTokenService } from './auth/token.js'
import { ChatStore } from './chat/chat-store.js'
import type { RateLimitPolicy } from './chat/rate-limiter.js'
import type { ServerConfig } from './config.js'
import { createSocketServer } from './socket/create-socket-server.js'

export interface ChatServerOptions {
  store?: ChatStore
  typingTimeoutMs?: number
  rateLimits?: RateLimitPolicy
}

/**
 * Wires HTTP + Socket.io around a fresh in-memory store.
 * Kept separate from `index.ts` so tests can boot isolated servers on random ports.
 */
export function createChatServer(config: ServerConfig, options: ChatServerOptions = {}) {
  const store = options.store ?? new ChatStore()
  const tokens = createTokenService(config.jwtSecret, config.jwtExpiresInSeconds)
  const app = createApp({
    config,
    tokens,
    isNicknameTaken: (nickname) => store.isNicknameOnline(nickname),
  })
  const httpServer = createServer(app)
  const io = createSocketServer(httpServer, {
    config,
    tokens,
    store,
    typingTimeoutMs: options.typingTimeoutMs,
    rateLimits: options.rateLimits,
  })

  return {
    httpServer,
    io,
    store,
    tokens,

    listen(port = config.port): Promise<number> {
      return new Promise((resolve, reject) => {
        httpServer.once('error', reject)
        httpServer.listen(port, () => {
          httpServer.off('error', reject)
          resolve((httpServer.address() as AddressInfo).port)
        })
      })
    },

    close(): Promise<void> {
      return new Promise((resolve) => {
        // io.close() also closes the underlying HTTP server.
        void io.close(() => resolve())
      })
    },
  }
}

export type ChatServer = ReturnType<typeof createChatServer>
