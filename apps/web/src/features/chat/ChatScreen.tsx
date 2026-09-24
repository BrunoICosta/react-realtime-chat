import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Theme } from '../../core/theme/use-theme'
import { Icon } from '../../shared/components/Icon'
import { LanguageSwitcher } from '../../shared/components/LanguageSwitcher'
import { ThemeToggle } from '../../shared/components/ThemeToggle'
import { useDocumentTitle } from '../../shared/hooks/use-document-title'
import { Composer } from './components/Composer'
import { ConnectionBanner } from './components/ConnectionBanner'
import { MessageList } from './components/MessageList'
import { NewMessagesPill } from './components/NewMessagesPill'
import { Notice } from './components/Notice'
import { OnlineUsers } from './components/OnlineUsers'
import { RoomsSidebar } from './components/RoomsSidebar'
import { TypingIndicator } from './components/TypingIndicator'
import { useAutoScroll } from './hooks/use-auto-scroll'
import { useTypingEmitter } from './hooks/use-typing-emitter'
import { useActiveRoom, useChatActions, useChatState } from './state/use-chat'
import './ChatScreen.css'

interface ChatScreenProps {
  theme: Theme
  onToggleTheme: () => void
}

const WIDE_SCREEN = '(min-width: 1200px)'
const isWideScreen = () => typeof matchMedia === 'function' && matchMedia(WIDE_SCREEN).matches

export function ChatScreen({ theme, onToggleTheme }: ChatScreenProps) {
  const { t } = useTranslation('chat')
  const { rooms, byRoom, self, status, everConnected, notice } = useChatState()
  const { roomId, room } = useActiveRoom()
  const actions = useChatActions()
  const { sendMessage, leaveRoom, retryMessage, dismissNotice } = actions
  const { onActivity, stopTyping } = useTypingEmitter(
    roomId,
    actions.startTyping,
    actions.stopTyping,
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  // The people panel starts open where there is room for a third column.
  const [usersOpen, setUsersOpen] = useState(isWideScreen)
  const { containerRef, onScroll, unseen, scrollToBottom } = useAutoScroll<HTMLDivElement>({
    roomId,
    messages: room.messages,
    selfId: self.id,
  })

  const summary = rooms.find((candidate) => candidate.id === roomId)
  const roomName = summary?.name ?? roomId ?? ''
  const isOverlayOpen = drawerOpen || usersOpen
  const totalUnread = Object.values(byRoom).reduce((sum, entry) => sum + entry.unread, 0)
  useDocumentTitle(roomName, totalUnread)

  // Crossing the breakpoint (rotating a tablet, resizing) should not leave the panel
  // covering the conversation: show it as a column on wide screens, hide it otherwise.
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const query = matchMedia(WIDE_SCREEN)
    const onChange = (event: MediaQueryListEvent) => setUsersOpen(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!isOverlayOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setDrawerOpen(false)
      if (!isWideScreen()) setUsersOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOverlayOpen])

  const closeOverlays = () => {
    setDrawerOpen(false)
    if (!isWideScreen()) setUsersOpen(false)
  }

  return (
    <div
      className="chat"
      data-drawer={drawerOpen ? 'open' : undefined}
      data-users={usersOpen ? 'open' : undefined}
    >
      <aside className="chat__sidebar" id="rooms-drawer" aria-label={t('sidebar.label')}>
        <RoomsSidebar onNavigate={() => setDrawerOpen(false)} />
      </aside>
      <div className="chat__scrim" aria-hidden="true" onClick={closeOverlays} />

      <section
        className="chat__main"
        aria-label={
          roomName ? t('header.section', { room: roomName }) : t('header.sectionFallback')
        }
      >
        <header className="chat__header">
          <button
            type="button"
            className="icon-btn chat__menu"
            aria-label={t('header.openRooms')}
            aria-controls="rooms-drawer"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <Icon name="menu" />
          </button>

          <div className="chat__room">
            <h1 className="chat__room-name">
              <Icon name="hash" size={18} />
              <span>{roomName || t('header.chooseRoom')}</span>
            </h1>
            {room.joined && (
              <p className="chat__room-meta">
                {t('header.peopleOnline', { count: room.users.length })}
              </p>
            )}
          </div>

          <div className="chat__actions">
            <button
              type="button"
              className="icon-btn"
              aria-label={t('header.people')}
              title={t('header.people')}
              aria-controls="online-users"
              aria-expanded={usersOpen}
              onClick={() => setUsersOpen((open) => !open)}
            >
              <Icon name="users" />
            </button>
            {roomId && room.joined && (
              <button
                type="button"
                className="icon-btn"
                onClick={() => leaveRoom(roomId)}
                aria-label={t('header.leave', { room: roomName })}
                title={t('header.leaveTitle')}
              >
                <Icon name="leave" />
              </button>
            )}
            <LanguageSwitcher />
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </header>

        <ConnectionBanner status={status} everConnected={everConnected} />

        <div className="chat__body-wrap">
          <div
            ref={containerRef}
            className="chat__body"
            onScroll={onScroll}
            role="log"
            aria-label={
              roomName ? t('messages.log', { room: roomName }) : t('messages.logFallback')
            }
            aria-relevant="additions"
            tabIndex={0}
          >
            <MessageList
              roomName={roomName}
              messages={room.messages}
              selfId={self.id}
              loading={room.loading}
              error={room.error}
              onRetry={retryMessage}
            />
          </div>
          <NewMessagesPill count={unseen} onClick={() => scrollToBottom()} />
        </div>

        <TypingIndicator users={room.typing} />
        <Composer
          key={roomId ?? 'none'}
          roomName={roomName}
          disabled={status !== 'connected' || !room.joined}
          disabledReason={status === 'connected' ? t('composer.joining') : t('composer.offline')}
          onSend={sendMessage}
          onTyping={onActivity}
          onStopTyping={stopTyping}
        />
      </section>

      <aside className="chat__users" id="online-users" aria-label={t('header.people')}>
        <OnlineUsers
          users={room.users}
          typing={room.typing}
          selfId={self.id}
          roomName={roomName}
          onClose={() => setUsersOpen(false)}
        />
      </aside>

      <Notice notice={notice} onDismiss={dismissNotice} />
    </div>
  )
}
