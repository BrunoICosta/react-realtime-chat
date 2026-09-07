import { useCallback, useEffect, useRef } from 'react'

export interface TypingEmitterOptions {
  /** Re-send `typing:start` at most this often while the user keeps typing. */
  throttleMs?: number
  /** Send `typing:stop` after this long without keystrokes. */
  idleMs?: number
}

/**
 * Translates keystrokes into a small number of typing events:
 * one `start` (refreshed every `throttleMs`) and one `stop` after `idleMs` of silence,
 * on send, or when the room changes.
 */
export function useTypingEmitter(
  roomId: string | null,
  start: (roomId: string) => void,
  stop: (roomId: string) => void,
  { throttleMs = 2_500, idleMs = 3_000 }: TypingEmitterOptions = {},
) {
  const lastStartRef = useRef(0)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingRoomRef = useRef<string | null>(null)

  const stopTyping = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = null
    const room = typingRoomRef.current
    if (room) stop(room)
    typingRoomRef.current = null
    lastStartRef.current = 0
  }, [stop])

  const onActivity = useCallback(() => {
    if (!roomId) return
    const now = Date.now()
    if (typingRoomRef.current !== roomId || now - lastStartRef.current >= throttleMs) {
      start(roomId)
      typingRoomRef.current = roomId
      lastStartRef.current = now
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(stopTyping, idleMs)
  }, [roomId, start, stopTyping, throttleMs, idleMs])

  // Leaving the room (or unmounting) ends the typing state there.
  useEffect(() => stopTyping, [roomId, stopTyping])

  return { onActivity, stopTyping }
}
