import { randomUUID } from 'node:crypto'
import {
  DEFAULT_ROOMS,
  LIMITS,
  slugifyRoomName,
  type ChatMessage,
  type PublicUser,
  type Room,
  type RoomSummary,
} from '@chat/shared'

export interface ChatStoreOptions {
  historyLimit?: number
  maxRooms?: number
  now?: () => number
}

export type CreateRoomOutcome =
  { ok: true; room: Room } | { ok: false; reason: 'CONFLICT' | 'LIMIT_REACHED' | 'VALIDATION' }

interface Presence {
  user: PublicUser
  /** A user may have several tabs open; they stay online until the last one leaves. */
  sockets: Set<string>
}

/**
 * In-memory state for the whole chat: rooms, a capped message history per room,
 * room presence and connected sessions. Everything is lost on restart by design.
 */
export class ChatStore {
  private readonly rooms = new Map<string, Room>()
  private readonly history = new Map<string, ChatMessage[]>()
  private readonly presence = new Map<string, Map<string, Presence>>()
  private readonly sessions = new Map<string, Presence>()
  private readonly historyLimit: number
  private readonly maxRooms: number
  private readonly now: () => number

  constructor(options: ChatStoreOptions = {}) {
    this.historyLimit = options.historyLimit ?? LIMITS.historyPerRoom
    this.maxRooms = options.maxRooms ?? LIMITS.maxRooms
    this.now = options.now ?? Date.now

    for (const room of DEFAULT_ROOMS) {
      this.addRoom({ id: room.id, name: room.name, createdAt: this.now(), createdBy: null })
    }
  }

  // Rooms ------------------------------------------------------------------

  listRooms(): RoomSummary[] {
    return [...this.rooms.values()].map((room) => this.toSummary(room))
  }

  getRoom(roomId: string): RoomSummary | undefined {
    const room = this.rooms.get(roomId)
    return room ? this.toSummary(room) : undefined
  }

  createRoom(name: string, createdBy: string): CreateRoomOutcome {
    const id = slugifyRoomName(name)
    if (!id) return { ok: false, reason: 'VALIDATION' }
    if (this.rooms.has(id)) return { ok: false, reason: 'CONFLICT' }
    if (this.rooms.size >= this.maxRooms) return { ok: false, reason: 'LIMIT_REACHED' }

    const room: Room = { id, name: name.trim(), createdAt: this.now(), createdBy }
    this.addRoom(room)
    return { ok: true, room }
  }

  private addRoom(room: Room) {
    this.rooms.set(room.id, room)
    this.history.set(room.id, [])
    this.presence.set(room.id, new Map())
  }

  private toSummary(room: Room): RoomSummary {
    return { ...room, onlineCount: this.presence.get(room.id)?.size ?? 0 }
  }

  // Messages ---------------------------------------------------------------

  addMessage(input: {
    roomId: string
    author: PublicUser
    text: string
    clientId?: string | undefined
  }): ChatMessage {
    const messages = this.history.get(input.roomId)
    if (!messages) throw new Error(`Unknown room: ${input.roomId}`)

    const message: ChatMessage = {
      id: randomUUID(),
      roomId: input.roomId,
      author: input.author,
      text: input.text,
      sentAt: this.now(),
      ...(input.clientId ? { clientId: input.clientId } : {}),
    }
    messages.push(message)
    if (messages.length > this.historyLimit) {
      messages.splice(0, messages.length - this.historyLimit)
    }
    return message
  }

  getHistory(roomId: string): ChatMessage[] {
    return [...(this.history.get(roomId) ?? [])]
  }

  // Presence ---------------------------------------------------------------

  /** Returns true when the user was not in the room before (presence changed). */
  joinRoom(roomId: string, user: PublicUser, socketId: string): boolean {
    const members = this.presence.get(roomId)
    if (!members) return false
    return addSocket(members, user, socketId)
  }

  /** Returns true when the user is no longer in the room (presence changed). */
  leaveRoom(roomId: string, userId: string, socketId: string): boolean {
    const members = this.presence.get(roomId)
    if (!members) return false
    return removeSocket(members, userId, socketId)
  }

  /** Removes a socket from every room. Returns the ids of rooms whose presence changed. */
  leaveAllRooms(userId: string, socketId: string): string[] {
    const changed: string[] = []
    for (const [roomId, members] of this.presence) {
      if (removeSocket(members, userId, socketId)) changed.push(roomId)
    }
    return changed
  }

  getOnlineUsers(roomId: string): PublicUser[] {
    const members = this.presence.get(roomId)
    if (!members) return []
    return [...members.values()]
      .map((entry) => entry.user)
      .sort((a, b) => a.nickname.localeCompare(b.nickname, 'pt-BR'))
  }

  // Sessions ---------------------------------------------------------------

  connect(user: PublicUser, socketId: string) {
    addSocket(this.sessions, user, socketId)
  }

  disconnect(userId: string, socketId: string) {
    removeSocket(this.sessions, userId, socketId)
  }

  isNicknameOnline(nickname: string): boolean {
    const wanted = nickname.trim().toLocaleLowerCase('pt-BR')
    for (const { user } of this.sessions.values()) {
      if (user.nickname.toLocaleLowerCase('pt-BR') === wanted) return true
    }
    return false
  }
}

function addSocket(map: Map<string, Presence>, user: PublicUser, socketId: string): boolean {
  const entry = map.get(user.id)
  if (entry) {
    entry.sockets.add(socketId)
    return false
  }
  map.set(user.id, { user, sockets: new Set([socketId]) })
  return true
}

function removeSocket(map: Map<string, Presence>, userId: string, socketId: string): boolean {
  const entry = map.get(userId)
  if (!entry || !entry.sockets.delete(socketId)) return false
  if (entry.sockets.size > 0) return false
  map.delete(userId)
  return true
}
