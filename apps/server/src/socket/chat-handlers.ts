import {
  createRoomSchema,
  roomRefSchema,
  sendMessageSchema,
  type Ack,
  type JoinRoomResult,
} from '@chat/shared'
import type { ChatStore } from '../chat/chat-store.js'
import type { RateLimitedAction, SocketRateLimiter } from '../chat/rate-limiter.js'
import type { TypingTracker } from '../chat/typing-tracker.js'
import { fail, ok, parsePayload, safeAck } from './ack.js'
import type { ChatIo, ChatSocket } from './types.js'

export interface ChatHandlerDeps {
  io: ChatIo
  store: ChatStore
  typing: TypingTracker
  rateLimit: SocketRateLimiter
}

export function registerChatHandlers(socket: ChatSocket, deps: ChatHandlerDeps) {
  const { io, store, typing, rateLimit } = deps
  const { user } = socket.data

  /** Returns true (and answers the ack, if any) when the socket exceeded its budget. */
  const isLimited = (action: RateLimitedAction, ack?: Ack<never>): boolean => {
    const result = rateLimit(action)
    if (result.allowed) return false
    ack?.(
      fail('RATE_LIMITED', 'Calma! Você está enviando rápido demais.', {
        retryAfterMs: result.retryAfterMs,
      }),
    )
    return true
  }

  const broadcastPresence = (roomId: string) => {
    io.to(roomId).emit('presence:update', { roomId, users: store.getOnlineUsers(roomId) })
    io.emit('rooms:update', store.listRooms())
  }

  socket.on('room:create', (payload, rawAck) => {
    const ack = safeAck(rawAck)
    if (isLimited('room', ack)) return
    const parsed = parsePayload(createRoomSchema, payload)
    if (!parsed.ok) return ack(parsed.result)

    const outcome = store.createRoom(parsed.data.name, user.id)
    if (!outcome.ok) {
      const messages = {
        CONFLICT: 'Já existe uma sala com esse nome',
        LIMIT_REACHED: 'O limite de salas foi atingido',
        VALIDATION: 'Nome de sala inválido',
      } as const
      return ack(fail(outcome.reason, messages[outcome.reason]))
    }

    ack(ok(outcome.room))
    io.emit('rooms:update', store.listRooms())
  })

  socket.on('room:join', async (payload, rawAck) => {
    const ack = safeAck<JoinRoomResult>(rawAck)
    if (isLimited('room', ack)) return
    const parsed = parsePayload(roomRefSchema, payload)
    if (!parsed.ok) return ack(parsed.result)

    const { roomId } = parsed.data
    if (!store.getRoom(roomId)) return ack(fail('NOT_FOUND', 'Sala não encontrada'))

    await socket.join(roomId)
    const changed = store.joinRoom(roomId, user, socket.id)
    const room = store.getRoom(roomId)
    if (!room) return ack(fail('NOT_FOUND', 'Sala não encontrada'))

    ack(
      ok({
        room,
        history: store.getHistory(roomId),
        users: store.getOnlineUsers(roomId),
      }),
    )

    const typingNow = typing.getTyping(roomId)
    if (typingNow.length > 0) socket.emit('typing:update', { roomId, users: typingNow })
    if (changed) broadcastPresence(roomId)
  })

  socket.on('room:leave', async (payload) => {
    if (isLimited('room')) return
    const parsed = parsePayload(roomRefSchema, payload)
    if (!parsed.ok) return

    const { roomId } = parsed.data
    await socket.leave(roomId)
    typing.stop(roomId, user.id)
    if (store.leaveRoom(roomId, user.id, socket.id)) broadcastPresence(roomId)
  })

  socket.on('message:send', (payload, rawAck) => {
    const ack = safeAck(rawAck)
    if (isLimited('message', ack)) return
    const parsed = parsePayload(sendMessageSchema, payload)
    if (!parsed.ok) return ack(parsed.result)

    const { roomId, text, clientId } = parsed.data
    if (!socket.rooms.has(roomId)) return ack(fail('NOT_IN_ROOM', 'Entre na sala antes de enviar'))

    const message = store.addMessage({ roomId, author: user, text, clientId })
    typing.stop(roomId, user.id)
    // The sender gets the message through the ack; everyone else (including the
    // sender's other tabs) through the broadcast.
    socket.to(roomId).emit('message:new', message)
    ack(ok(message))
  })

  socket.on('typing:start', (payload) => {
    if (isLimited('typing')) return
    const parsed = parsePayload(roomRefSchema, payload)
    if (!parsed.ok || !socket.rooms.has(parsed.data.roomId)) return
    typing.start(parsed.data.roomId, user)
  })

  socket.on('typing:stop', (payload) => {
    const parsed = parsePayload(roomRefSchema, payload)
    if (!parsed.ok) return
    typing.stop(parsed.data.roomId, user.id)
  })

  socket.on('disconnect', () => {
    typing.stopEverywhere(user.id)
    for (const roomId of store.leaveAllRooms(user.id, socket.id)) broadcastPresence(roomId)
    store.disconnect(user.id, socket.id)
  })
}
