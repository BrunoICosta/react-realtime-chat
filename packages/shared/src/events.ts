import type { ChatMessage, JoinRoomResult, PublicUser, Room, RoomSummary } from './models.js'
import type { CreateRoomInput, RoomRef, SendMessageInput } from './schemas.js'

export type ErrorCode =
  'VALIDATION' | 'RATE_LIMITED' | 'NOT_FOUND' | 'NOT_IN_ROOM' | 'CONFLICT' | 'LIMIT_REACHED'

export interface AckError {
  code: ErrorCode
  message: string
  /** Present when `code` is `RATE_LIMITED`. */
  retryAfterMs?: number
}

export type AckResult<T> = { ok: true; data: T } | { ok: false; error: AckError }

export type Ack<T> = (result: AckResult<T>) => void

export interface PresencePayload {
  roomId: string
  users: PublicUser[]
}

export interface TypingPayload {
  roomId: string
  users: PublicUser[]
}

/** Events the browser emits. Every request/response style event takes an ack callback. */
export interface ClientToServerEvents {
  'room:create': (payload: CreateRoomInput, ack: Ack<Room>) => void
  'room:join': (payload: RoomRef, ack: Ack<JoinRoomResult>) => void
  'room:leave': (payload: RoomRef) => void
  'message:send': (payload: SendMessageInput, ack: Ack<ChatMessage>) => void
  'typing:start': (payload: RoomRef) => void
  'typing:stop': (payload: RoomRef) => void
}

/** Events the server pushes. */
export interface ServerToClientEvents {
  'rooms:update': (rooms: RoomSummary[]) => void
  'message:new': (message: ChatMessage) => void
  'presence:update': (payload: PresencePayload) => void
  'typing:update': (payload: TypingPayload) => void
}

export type ServerEventName = keyof ServerToClientEvents
export type ServerEventPayload<E extends ServerEventName> = Parameters<ServerToClientEvents[E]>[0]

/** Error message sent by the auth middleware when the handshake token is missing or invalid. */
export const UNAUTHORIZED_ERROR = 'UNAUTHORIZED'
