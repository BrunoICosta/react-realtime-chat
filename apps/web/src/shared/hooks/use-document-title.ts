import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/** "(3) #geral · Chat em Tempo Real", lets people notice new messages from another tab. */
export function useDocumentTitle(roomName: string, unread: number) {
  const { t } = useTranslation(['common', 'chat'])

  useEffect(() => {
    const app = t('appName')
    const prefix = unread > 0 ? `(${unread > 99 ? '99+' : unread}) ` : ''
    const base = roomName ? t('chat:title', { room: roomName, app }) : app
    document.title = `${prefix}${base}`
    return () => {
      document.title = app
    }
  }, [roomName, unread, t])
}
