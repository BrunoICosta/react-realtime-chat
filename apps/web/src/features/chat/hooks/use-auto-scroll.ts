import { useCallback, useLayoutEffect, useRef, useState } from 'react'

interface AutoScrollMessage {
  id: string
  clientId?: string | undefined
  author: { id: string }
}

interface AutoScrollOptions {
  roomId: string | null
  messages: readonly AutoScrollMessage[]
  selfId: string
  /** Distance from the bottom (px) still considered "at the bottom". */
  threshold?: number
}

/**
 * Chat-style scrolling:
 * - sticks to the bottom while the reader is there (or sends a message);
 * - otherwise keeps the position and counts the unseen messages for the "new messages" pill;
 * - jumps to the bottom when switching rooms or when the history first arrives.
 */
export function useAutoScroll<T extends HTMLElement>({
  roomId,
  messages,
  selfId,
  threshold = 80,
}: AutoScrollOptions) {
  const containerRef = useRef<T>(null)
  const atBottomRef = useRef(true)
  const previousRef = useRef<{ roomId: string | null; count: number; lastKey: string | null }>({
    roomId: null,
    count: 0,
    lastKey: null,
  })
  const [unseen, setUnseen] = useState(0)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.current
    if (!container) return
    container.scrollTo({ top: container.scrollHeight, behavior })
    atBottomRef.current = true
    setUnseen(0)
  }, [])

  const onScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight
    atBottomRef.current = distance <= threshold
    if (atBottomRef.current) setUnseen(0)
  }, [threshold])

  useLayoutEffect(() => {
    const previous = previousRef.current
    const last = messages[messages.length - 1]
    const lastKey = last ? (last.clientId ?? last.id) : null
    previousRef.current = { roomId, count: messages.length, lastKey }

    if (previous.roomId !== roomId || previous.count === 0) {
      scrollToBottom('auto')
      return
    }
    if (!last || lastKey === previous.lastKey) return

    if (atBottomRef.current || last.author.id === selfId) {
      scrollToBottom('smooth')
      return
    }

    // New messages while reading older ones: count the ones from other people.
    const added = messages.slice(previous.count).filter((message) => message.author.id !== selfId)
    if (added.length > 0) setUnseen((count) => count + added.length)
  }, [roomId, messages, selfId, scrollToBottom])

  return { containerRef, onScroll, unseen, scrollToBottom }
}
