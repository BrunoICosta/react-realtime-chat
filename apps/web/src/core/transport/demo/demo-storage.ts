import { DEFAULT_ROOMS, LIMITS, type ChatMessage, type Room } from '@chat/shared'
import { SEED_TEXTS } from './demo-content'
import { BOT_USER, DIEGO, MARINA } from './demo-users'

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

interface DemoSnapshot {
  version: 1
  rooms: Room[]
  messages: Record<string, ChatMessage[]>
}

const MINUTE = 60_000

/**
 * The "database" of demo mode. It lives in localStorage, which every tab of the
 * origin shares, so a tab opened later still sees rooms and history. Falls back to
 * memory when storage is unavailable (private mode, tests).
 */
export class DemoStorage {
  private memory: DemoSnapshot | null = null
  private readonly storage: KeyValueStorage | null
  private readonly key: string
  private readonly now: () => number

  constructor(storage: KeyValueStorage | null, key = 'rrc:demo:v1', now: () => number = Date.now) {
    this.storage = storage
    this.key = key
    this.now = now
  }

  listRooms(): Room[] {
    return this.read().rooms
  }

  getRoom(roomId: string): Room | undefined {
    return this.read().rooms.find((room) => room.id === roomId)
  }

  addRoom(room: Room) {
    const snapshot = this.read()
    snapshot.rooms.push(room)
    snapshot.messages[room.id] = []
    this.write(snapshot)
  }

  getHistory(roomId: string): ChatMessage[] {
    return this.read().messages[roomId] ?? []
  }

  appendMessage(message: ChatMessage) {
    const snapshot = this.read()
    const messages = snapshot.messages[message.roomId] ?? []
    if (messages.some((existing) => existing.id === message.id)) return
    messages.push(message)
    snapshot.messages[message.roomId] = messages.slice(-LIMITS.historyPerRoom)
    this.write(snapshot)
  }

  private read(): DemoSnapshot {
    if (this.storage) {
      try {
        const raw = this.storage.getItem(this.key)
        if (raw) {
          const parsed = JSON.parse(raw) as DemoSnapshot
          if (parsed.version === 1 && Array.isArray(parsed.rooms)) return parsed
        }
      } catch {
        // Corrupted or inaccessible storage: start over below.
      }
    }
    if (!this.memory) this.memory = createSeed(this.now())
    if (this.storage) this.write(this.memory)
    return structuredClone(this.memory)
  }

  private write(snapshot: DemoSnapshot) {
    this.memory = snapshot
    if (!this.storage) return
    try {
      this.storage.setItem(this.key, JSON.stringify(snapshot))
    } catch {
      // Quota exceeded: keep going with the in-memory copy.
    }
  }
}

function createSeed(now: number): DemoSnapshot {
  const rooms: Room[] = DEFAULT_ROOMS.map((room) => ({
    id: room.id,
    name: room.name,
    createdAt: now - 60 * MINUTE,
    createdBy: null,
  }))

  // Stored in pt-BR; the transport re-localizes seed messages when they are read.
  const seed = (roomId: string, minutesAgo: number, author: ChatMessage['author']): ChatMessage => {
    const id = `seed-${roomId}-${minutesAgo}`
    return {
      id,
      roomId,
      author,
      text: SEED_TEXTS['pt-BR'][id] ?? '',
      sentAt: now - minutesAgo * MINUTE,
    }
  }

  return {
    version: 1,
    rooms,
    messages: {
      geral: [seed('geral', 12, MARINA), seed('geral', 3, BOT_USER)],
      dev: [seed('dev', 50, MARINA), seed('dev', 48, DIEGO), seed('dev', 47, DIEGO)],
      random: [seed('random', 30, DIEGO)],
    },
  }
}
