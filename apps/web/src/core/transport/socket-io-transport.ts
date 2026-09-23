import {
  UNAUTHORIZED_ERROR,
  type AckResult,
  type ClientToServerEvents,
  type LoginInput,
  type ServerToClientEvents,
  type ValidationCode,
} from '@chat/shared'
import { io, type Socket } from 'socket.io-client'
import { Emitter } from '../lib/emitter'
import {
  TransportError,
  toTransportErrorCode,
  type ChatTransport,
  type Session,
  type TransportEvents,
} from './chat-transport'

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>

interface ErrorBody {
  error?: { code?: string; detail?: ValidationCode }
}

export class SocketIoTransport implements ChatTransport {
  readonly mode = 'socket' as const
  private socket: ClientSocket | null = null
  private readonly events = new Emitter<TransportEvents>()
  private readonly serverUrl: string
  private readonly ackTimeoutMs: number

  constructor(serverUrl: string, ackTimeoutMs = 8_000) {
    this.serverUrl = serverUrl.replace(/\/+$/, '')
    this.ackTimeoutMs = ackTimeoutMs
  }

  async login(input: LoginInput): Promise<Session> {
    let response: Response
    try {
      response = await fetch(`${this.serverUrl}/api/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })
    } catch {
      throw new TransportError('NETWORK')
    }

    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const error = (body as ErrorBody | null)?.error
      throw new TransportError(toTransportErrorCode(error?.code), error?.detail)
    }
    return body as Session
  }

  connect(session: Session) {
    this.disconnect()
    this.events.emit('status', 'connecting')

    const socket: ClientSocket = io(this.serverUrl, {
      auth: { token: session.token },
      reconnectionDelay: 500,
      reconnectionDelayMax: 5_000,
    })
    this.socket = socket

    socket.on('connect', () => this.events.emit('status', 'connected'))
    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') return
      this.events.emit('status', 'reconnecting')
      // The server kicked us out explicitly: socket.io will not retry on its own.
      if (reason === 'io server disconnect') socket.connect()
    })
    socket.on('connect_error', (error) => {
      if (error.message === UNAUTHORIZED_ERROR) {
        this.disconnect()
        this.events.emit('auth:expired')
        return
      }
      this.events.emit('status', 'reconnecting')
    })

    socket.on('rooms:update', (rooms) => this.events.emit('rooms:update', rooms))
    socket.on('message:new', (message) => this.events.emit('message:new', message))
    socket.on('presence:update', (payload) => this.events.emit('presence:update', payload))
    socket.on('typing:update', (payload) => this.events.emit('typing:update', payload))
  }

  disconnect() {
    if (!this.socket) return
    this.socket.removeAllListeners()
    this.socket.disconnect()
    this.socket = null
    this.events.emit('status', 'offline')
  }

  on<E extends keyof TransportEvents>(event: E, listener: TransportEvents[E]) {
    return this.events.on(event, listener)
  }

  createRoom(name: string) {
    return this.request((socket) => socket.emitWithAck('room:create', { name }))
  }

  joinRoom(roomId: string) {
    return this.request((socket) => socket.emitWithAck('room:join', { roomId }))
  }

  leaveRoom(roomId: string) {
    this.socket?.emit('room:leave', { roomId })
  }

  sendMessage(input: Parameters<ChatTransport['sendMessage']>[0]) {
    return this.request((socket) => socket.emitWithAck('message:send', input))
  }

  startTyping(roomId: string) {
    if (this.socket?.connected) this.socket.emit('typing:start', { roomId })
  }

  stopTyping(roomId: string) {
    if (this.socket?.connected) this.socket.emit('typing:stop', { roomId })
  }

  /** Runs an ack-based request with a timeout and unwraps the `AckResult`. */
  private async request<T>(send: (socket: ClientSocket) => Promise<AckResult<T>>): Promise<T> {
    const socket = this.socket
    if (!socket?.connected) {
      throw new TransportError('OFFLINE')
    }

    let result: AckResult<T>
    try {
      result = await send(socket.timeout(this.ackTimeoutMs) as ClientSocket)
    } catch {
      throw new TransportError('TIMEOUT')
    }

    if (!result.ok) {
      throw new TransportError(
        toTransportErrorCode(result.error.code),
        result.error.detail,
        result.error.retryAfterMs,
      )
    }
    return result.data
  }
}
