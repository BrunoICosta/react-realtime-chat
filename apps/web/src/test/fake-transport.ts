import type { ChatMessage, JoinRoomResult, RoomSummary } from '@chat/shared'
import { vi } from 'vitest'
import { Emitter } from '../core/lib/emitter'
import type { ChatTransport, TransportEvents } from '../core/transport/chat-transport'

export const ROOMS: RoomSummary[] = [
  { id: 'geral', name: 'geral', createdAt: 0, createdBy: null, onlineCount: 1 },
  { id: 'dev', name: 'dev', createdAt: 0, createdBy: null, onlineCount: 0 },
]

/** Scriptable transport for component tests: tests push server events with `emit`. */
export class FakeTransport implements ChatTransport {
  readonly mode = 'socket' as const
  readonly events = new Emitter<TransportEvents>()
  history: Record<string, ChatMessage[]> = {}

  login = vi.fn(async ({ nickname, color }: { nickname: string; color?: string | undefined }) => ({
    token: 'token',
    user: { id: 'me', nickname, color: color ?? '#6366f1' },
  }))

  connect = vi.fn(() => {
    this.events.emit('status', 'connected')
    this.events.emit('rooms:update', ROOMS)
  })

  disconnect = vi.fn()

  createRoom = vi.fn(async (name: string) => ({
    id: name,
    name,
    createdAt: 0,
    createdBy: 'me',
  }))

  joinRoom = vi.fn(async (roomId: string): Promise<JoinRoomResult> => {
    const room = ROOMS.find((candidate) => candidate.id === roomId) ?? ROOMS[0]
    if (!room) throw new Error('no rooms')
    return {
      room,
      history: this.history[roomId] ?? [],
      users: [{ id: 'me', nickname: 'Eu', color: '#6366f1' }],
    }
  })

  leaveRoom = vi.fn()

  sendMessage = vi.fn(
    async ({ roomId, text, clientId }: Parameters<ChatTransport['sendMessage']>[0]) => ({
      id: `srv-${clientId}`,
      roomId,
      text,
      clientId,
      sentAt: Date.now(),
      author: { id: 'me', nickname: 'Eu', color: '#6366f1' },
    }),
  )

  startTyping = vi.fn()
  stopTyping = vi.fn()

  on<E extends keyof TransportEvents>(event: E, listener: TransportEvents[E]) {
    return this.events.on(event, listener)
  }

  emit<E extends keyof TransportEvents>(event: E, ...args: Parameters<TransportEvents[E]>) {
    this.events.emit(event, ...args)
  }
}
