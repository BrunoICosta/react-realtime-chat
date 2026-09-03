import type {
  ChatMessage,
  ErrorCode,
  JoinRoomResult,
  LoginInput,
  LoginResponse,
  Room,
  SendMessageInput,
  ServerToClientEvents,
} from '@chat/shared'

export type TransportMode = 'socket' | 'demo'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline'

export type Session = LoginResponse

/** Everything the UI can listen to: the server events plus transport lifecycle events. */
export interface TransportEvents extends ServerToClientEvents {
  status: (status: ConnectionStatus) => void
  /** The session token was rejected; the user has to log in again. */
  'auth:expired': () => void
}

export type Unsubscribe = () => void

/**
 * The only thing the React tree knows about the network.
 *
 * - `SocketIoTransport` talks to the real Node server.
 * - `BroadcastChannelTransport` fakes a server inside the browser so the static
 *   GitHub Pages build still works (tabs chat with each other, plus a bot).
 */
export interface ChatTransport {
  readonly mode: TransportMode
  login(input: LoginInput): Promise<Session>
  connect(session: Session): void
  disconnect(): void
  on<E extends keyof TransportEvents>(event: E, listener: TransportEvents[E]): Unsubscribe
  createRoom(name: string): Promise<Room>
  joinRoom(roomId: string): Promise<JoinRoomResult>
  leaveRoom(roomId: string): void
  sendMessage(input: SendMessageInput): Promise<ChatMessage>
  startTyping(roomId: string): void
  stopTyping(roomId: string): void
}

export type TransportErrorCode = ErrorCode | 'NETWORK' | 'TIMEOUT' | 'OFFLINE'

export class TransportError extends Error {
  readonly code: TransportErrorCode
  readonly retryAfterMs: number | undefined

  constructor(code: TransportErrorCode, message: string, retryAfterMs?: number) {
    super(message)
    this.name = 'TransportError'
    this.code = code
    this.retryAfterMs = retryAfterMs
  }
}

export function errorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.') {
  return error instanceof Error && error.message ? error.message : fallback
}
