import type { ClientToServerEvents, PublicUser, ServerToClientEvents } from '@chat/shared'
import type { Server, Socket } from 'socket.io'

export interface SocketData {
  user: PublicUser
}

type InterServerEvents = Record<string, never>

export type ChatIo = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>
export type ChatSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>
