import { useEffect } from 'react'

const BASE_TITLE = 'Realtime Chat'

/** "(3) #geral · Realtime Chat" — lets people notice new messages from another tab. */
export function useDocumentTitle(roomName: string, unread: number) {
  useEffect(() => {
    const prefix = unread > 0 ? `(${unread > 99 ? '99+' : unread}) ` : ''
    const room = roomName ? `#${roomName} · ` : ''
    document.title = `${prefix}${room}${BASE_TITLE}`
    return () => {
      document.title = BASE_TITLE
    }
  }, [roomName, unread])
}
