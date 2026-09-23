import type {
  ChatMessage,
  JoinRoomResult,
  PresencePayload,
  PublicUser,
  RoomSummary,
  TypingPayload,
} from '@chat/shared'
import type { ConnectionStatus, ErrorInfo } from '../../../core/transport/chat-transport'

export type DeliveryStatus = 'sent' | 'pending' | 'failed'

export interface ChatEntry extends ChatMessage {
  status: DeliveryStatus
}

export interface RoomState {
  messages: ChatEntry[]
  users: PublicUser[]
  typing: PublicUser[]
  unread: number
  joined: boolean
  loading: boolean
  error: ErrorInfo | null
}

export interface ChatState {
  self: PublicUser
  status: ConnectionStatus
  /** True once the first connection succeeded; distinguishes "connecting" from "reconnecting". */
  everConnected: boolean
  rooms: RoomSummary[]
  activeRoomId: string | null
  byRoom: Record<string, RoomState>
}

export type ChatAction =
  | { type: 'status'; status: ConnectionStatus }
  | { type: 'rooms'; rooms: RoomSummary[] }
  | { type: 'activate'; roomId: string }
  | { type: 'joinStarted'; roomId: string }
  | { type: 'joined'; result: JoinRoomResult }
  | { type: 'joinFailed'; roomId: string; error: ErrorInfo }
  | { type: 'left'; roomId: string }
  | { type: 'received'; message: ChatMessage }
  | { type: 'pending'; message: ChatMessage }
  | { type: 'confirmed'; clientId: string; message: ChatMessage }
  | { type: 'failed'; clientId: string }
  | { type: 'retrying'; clientId: string }
  | { type: 'presence'; payload: PresencePayload }
  | { type: 'typing'; payload: TypingPayload }

export const emptyRoom = (): RoomState => ({
  messages: [],
  users: [],
  typing: [],
  unread: 0,
  joined: false,
  loading: false,
  error: null,
})

export function createInitialState(self: PublicUser): ChatState {
  return {
    self,
    status: 'idle',
    everConnected: false,
    rooms: [],
    activeRoomId: null,
    byRoom: {},
  }
}

/** Pure state transitions for the chat; every transport event ends up here. */
export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'status':
      return {
        ...state,
        status: action.status,
        everConnected: state.everConnected || action.status === 'connected',
      }

    case 'rooms':
      return { ...state, rooms: action.rooms }

    case 'activate': {
      const room = state.byRoom[action.roomId] ?? emptyRoom()
      return {
        ...state,
        activeRoomId: action.roomId,
        byRoom: { ...state.byRoom, [action.roomId]: { ...room, unread: 0 } },
      }
    }

    case 'joinStarted':
      return updateRoom(state, action.roomId, (room) => ({ ...room, loading: true, error: null }))

    case 'joined': {
      const { room, history, users } = action.result
      const next = updateRoom(state, room.id, (current) => ({
        ...current,
        messages: mergeHistory(current.messages, history),
        users,
        joined: true,
        loading: false,
        error: null,
      }))
      return { ...next, rooms: upsertRoom(next.rooms, room) }
    }

    case 'joinFailed':
      return updateRoom(state, action.roomId, (room) => ({
        ...room,
        loading: false,
        error: action.error,
      }))

    case 'left': {
      const byRoom = { ...state.byRoom }
      delete byRoom[action.roomId]
      return {
        ...state,
        byRoom,
        activeRoomId: state.activeRoomId === action.roomId ? null : state.activeRoomId,
      }
    }

    case 'received': {
      const { message } = action
      const current = state.byRoom[message.roomId]
      if (!current?.joined) return state
      if (current.messages.some((entry) => entry.id === message.id)) return state

      const isOwn = message.author.id === state.self.id
      const isVisible = state.activeRoomId === message.roomId
      return updateRoom(state, message.roomId, (room) => ({
        ...room,
        messages: insertSorted(room.messages, { ...message, status: 'sent' }),
        typing: room.typing.filter((user) => user.id !== message.author.id),
        unread: isOwn || isVisible ? room.unread : room.unread + 1,
      }))
    }

    case 'pending':
      return updateRoom(state, action.message.roomId, (room) => ({
        ...room,
        messages: [...room.messages, { ...action.message, status: 'pending' }],
      }))

    case 'confirmed':
      return mapEntries(state, action.message.roomId, (entry) =>
        entry.clientId === action.clientId ? { ...action.message, status: 'sent' } : entry,
      )

    case 'failed':
    case 'retrying': {
      const status: DeliveryStatus = action.type === 'failed' ? 'failed' : 'pending'
      const roomId = findRoomOfClientId(state, action.clientId)
      if (!roomId) return state
      return mapEntries(state, roomId, (entry) =>
        entry.clientId === action.clientId && entry.status !== 'sent'
          ? { ...entry, status }
          : entry,
      )
    }

    case 'presence':
      if (!state.byRoom[action.payload.roomId]) return state
      return updateRoom(state, action.payload.roomId, (room) => ({
        ...room,
        users: action.payload.users,
      }))

    case 'typing':
      if (!state.byRoom[action.payload.roomId]) return state
      return updateRoom(state, action.payload.roomId, (room) => ({
        ...room,
        typing: action.payload.users.filter((user) => user.id !== state.self.id),
      }))
  }
}

function updateRoom(
  state: ChatState,
  roomId: string,
  update: (room: RoomState) => RoomState,
): ChatState {
  const room = state.byRoom[roomId] ?? emptyRoom()
  return { ...state, byRoom: { ...state.byRoom, [roomId]: update(room) } }
}

function mapEntries(
  state: ChatState,
  roomId: string,
  map: (entry: ChatEntry) => ChatEntry,
): ChatState {
  if (!state.byRoom[roomId]) return state
  return updateRoom(state, roomId, (room) => ({ ...room, messages: room.messages.map(map) }))
}

function findRoomOfClientId(state: ChatState, clientId: string): string | undefined {
  return Object.keys(state.byRoom).find((roomId) =>
    state.byRoom[roomId]?.messages.some((entry) => entry.clientId === clientId),
  )
}

function upsertRoom(rooms: RoomSummary[], room: RoomSummary): RoomSummary[] {
  return rooms.some((existing) => existing.id === room.id)
    ? rooms.map((existing) => (existing.id === room.id ? room : existing))
    : [...rooms, room]
}

/**
 * Merges a (re)join history with what is already on screen: server messages win,
 * duplicates are dropped and local messages that are still pending/failed are kept.
 */
export function mergeHistory(current: ChatEntry[], history: ChatMessage[]): ChatEntry[] {
  const byId = new Map<string, ChatEntry>()
  for (const message of history) byId.set(message.id, { ...message, status: 'sent' })

  const confirmedClientIds = new Set(history.map((message) => message.clientId).filter(Boolean))
  const local = current.filter((entry) => {
    if (entry.status === 'sent') return !byId.has(entry.id)
    return !(entry.clientId && confirmedClientIds.has(entry.clientId))
  })

  const sent = [...byId.values(), ...local.filter((entry) => entry.status === 'sent')].sort(
    (a, b) => a.sentAt - b.sentAt,
  )
  return [...sent, ...local.filter((entry) => entry.status !== 'sent')]
}

/** Appends keeping chronological order (messages can arrive slightly out of order). */
function insertSorted(entries: ChatEntry[], entry: ChatEntry): ChatEntry[] {
  const pendingStart = entries.findIndex((existing) => existing.status !== 'sent')
  const sent = pendingStart === -1 ? entries : entries.slice(0, pendingStart)
  const unsent = pendingStart === -1 ? [] : entries.slice(pendingStart)

  let index = sent.length
  while (index > 0 && (sent[index - 1]?.sentAt ?? 0) > entry.sentAt) index--
  return [...sent.slice(0, index), entry, ...sent.slice(index), ...unsent]
}
