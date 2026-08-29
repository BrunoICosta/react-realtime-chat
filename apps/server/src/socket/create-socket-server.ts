import type { Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'
import type { TokenService } from '../auth/token.js'
import type { ChatStore } from '../chat/chat-store.js'
import type { ServerConfig } from '../config.js'
import { createAuthMiddleware } from './auth-middleware.js'
import type { ChatIo } from './types.js'

export interface SocketServerDeps {
  config: ServerConfig
  tokens: TokenService
  store: ChatStore
}

export function createSocketServer(httpServer: HttpServer, deps: SocketServerDeps): ChatIo {
  const { config, tokens, store } = deps

  const io: ChatIo = new Server(httpServer, {
    cors: { origin: config.corsOrigins },
    // Chat payloads are tiny; refuse anything big before it reaches the handlers.
    maxHttpBufferSize: 16 * 1024,
  })

  io.use(createAuthMiddleware(tokens))

  io.on('connection', (socket) => {
    const { user } = socket.data
    store.connect(user, socket.id)
    socket.emit('rooms:update', store.listRooms())

    socket.on('disconnect', () => {
      store.disconnect(user.id, socket.id)
    })
  })

  return io
}
