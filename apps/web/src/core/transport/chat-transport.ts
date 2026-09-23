import type {
  ChatMessage,
  ErrorCode,
  ValidationCode,
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

export const TRANSPORT_ERROR_CODES = [
  'VALIDATION',
  'RATE_LIMITED',
  'NOT_FOUND',
  'NOT_IN_ROOM',
  'CONFLICT',
  'LIMIT_REACHED',
  'NETWORK',
  'TIMEOUT',
  'OFFLINE',
  'UNKNOWN',
] as const

export type TransportErrorCode = (typeof TRANSPORT_ERROR_CODES)[number]

/** Compile-time guard: every server error code must be a transport error code too. */
export const SERVER_CODES_ARE_COVERED: ErrorCode extends TransportErrorCode ? true : never = true

/** What the UI needs to describe a failure. It is translated at render time, never stored as text. */
export interface ErrorInfo {
  code: TransportErrorCode
  detail?: ValidationCode | undefined
}

export class TransportError extends Error {
  readonly code: TransportErrorCode
  readonly detail: ValidationCode | undefined
  readonly retryAfterMs: number | undefined

  constructor(code: TransportErrorCode, detail?: ValidationCode, retryAfterMs?: number) {
    // The message is for logs only; users see a translated text built from the code.
    super(detail ? `${code}: ${detail}` : code)
    this.name = 'TransportError'
    this.code = code
    this.detail = detail
    this.retryAfterMs = retryAfterMs
  }
}

/** Accepts unknown codes from the wire (e.g. HTTP 500 "INTERNAL") and maps them to UNKNOWN. */
export function toTransportErrorCode(code: unknown): TransportErrorCode {
  return TRANSPORT_ERROR_CODES.includes(code as TransportErrorCode)
    ? (code as TransportErrorCode)
    : 'UNKNOWN'
}

export function toErrorInfo(error: unknown): ErrorInfo {
  if (error instanceof TransportError) return { code: error.code, detail: error.detail }
  return { code: 'UNKNOWN' }
}
