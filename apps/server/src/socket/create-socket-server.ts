import type { Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'
import type { TokenService } from '../auth/token.js'
import type { ChatStore } from '../chat/chat-store.js'
import { TypingTracker } from '../chat/typing-tracker.js'
import type { ServerConfig } from '../config.js'
import { createAuthMiddleware } from './auth-middleware.js'
import { registerChatHandlers } from './chat-handlers.js'
import type { ChatIo } from './types.js'

export interface SocketServerDeps {
  config: ServerConfig
  tokens: TokenService
  store: ChatStore
  typingTimeoutMs?: number
}

export function createSocketServer(httpServer: HttpServer, deps: SocketServerDeps): ChatIo {
  const { config, tokens, store } = deps

  const io: ChatIo = new Server(httpServer, {
    cors: { origin: config.corsOrigins },
    // Chat payloads are tiny; refuse anything big before it reaches the handlers.
    maxHttpBufferSize: 16 * 1024,
  })

  const typing = new TypingTracker((roomId, users) => {
    io.to(roomId).emit('typing:update', { roomId, users })
  }, deps.typingTimeoutMs)
  httpServer.once('close', () => typing.dispose())

  io.use(createAuthMiddleware(tokens))

  io.on('connection', (socket) => {
    store.connect(socket.data.user, socket.id)
    socket.emit('rooms:update', store.listRooms())
    registerChatHandlers(socket, { io, store, typing })
  })

  return io
}
