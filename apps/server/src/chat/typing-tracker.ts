import { TYPING_TIMEOUT_MS, type PublicUser } from '@chat/shared'

type Timer = ReturnType<typeof setTimeout>

/**
 * Keeps who is typing in each room. Entries expire on their own, so a client that
 * disconnects (or never sends `typing:stop`) does not stay "typing" forever.
 */
export class TypingTracker {
  private readonly rooms = new Map<string, Map<string, { user: PublicUser; timer: Timer }>>()

  constructor(
    private readonly onChange: (roomId: string, users: PublicUser[]) => void,
    private readonly timeoutMs: number = TYPING_TIMEOUT_MS,
  ) {}

  start(roomId: string, user: PublicUser) {
    let typing = this.rooms.get(roomId)
    if (!typing) {
      typing = new Map()
      this.rooms.set(roomId, typing)
    }

    const existing = typing.get(user.id)
    if (existing) clearTimeout(existing.timer)

    const timer = setTimeout(() => this.stop(roomId, user.id), this.timeoutMs)
    timer.unref?.()
    typing.set(user.id, { user, timer })

    // Refreshing the timer of someone who is already typing is not a visible change.
    if (!existing) this.emit(roomId)
  }

  stop(roomId: string, userId: string) {
    const typing = this.rooms.get(roomId)
    const entry = typing?.get(userId)
    if (!typing || !entry) return

    clearTimeout(entry.timer)
    typing.delete(userId)
    if (typing.size === 0) this.rooms.delete(roomId)
    this.emit(roomId)
  }

  stopEverywhere(userId: string) {
    for (const roomId of [...this.rooms.keys()]) this.stop(roomId, userId)
  }

  getTyping(roomId: string): PublicUser[] {
    return [...(this.rooms.get(roomId)?.values() ?? [])].map((entry) => entry.user)
  }

  dispose() {
    for (const typing of this.rooms.values()) {
      for (const entry of typing.values()) clearTimeout(entry.timer)
    }
    this.rooms.clear()
  }

  private emit(roomId: string) {
    this.onChange(roomId, this.getTyping(roomId))
  }
}
