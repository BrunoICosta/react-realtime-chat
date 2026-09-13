import { useEffect, useState } from 'react'
import type { Theme } from '../../core/theme/use-theme'
import { Icon } from '../../shared/components/Icon'
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

export function ChatScreen({ theme, onToggleTheme }: ChatScreenProps) {
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
  const [usersOpen, setUsersOpen] = useState(
    () => typeof matchMedia === 'function' && matchMedia(WIDE_SCREEN).matches,
  )
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

  useEffect(() => {
    if (!isOverlayOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setDrawerOpen(false)
      if (!matchMedia(WIDE_SCREEN).matches) setUsersOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOverlayOpen])

  const closeOverlays = () => {
    setDrawerOpen(false)
    if (!matchMedia(WIDE_SCREEN).matches) setUsersOpen(false)
  }

  return (
    <div
      className="chat"
      data-drawer={drawerOpen ? 'open' : undefined}
      data-users={usersOpen ? 'open' : undefined}
    >
      <aside className="chat__sidebar" id="rooms-drawer" aria-label="Salas e perfil">
        <RoomsSidebar onNavigate={() => setDrawerOpen(false)} />
      </aside>
      <div className="chat__scrim" aria-hidden="true" onClick={closeOverlays} />

      <section className="chat__main" aria-label={roomName ? `Sala #${roomName}` : 'Conversa'}>
        <header className="chat__header">
          <button
            type="button"
            className="icon-btn chat__menu"
            aria-label="Abrir salas"
            aria-controls="rooms-drawer"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <Icon name="menu" />
          </button>

          <div className="chat__room">
            <h1 className="chat__room-name">
              <Icon name="hash" size={18} />
              <span>{roomName || 'Escolha uma sala'}</span>
            </h1>
            {room.joined && (
              <p className="chat__room-meta">
                {room.users.length === 1
                  ? '1 pessoa online'
                  : `${room.users.length} pessoas online`}
              </p>
            )}
          </div>

          <div className="chat__actions">
            <button
              type="button"
              className="icon-btn"
              aria-label="Pessoas online"
              title="Pessoas online"
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
                aria-label={`Sair da sala #${roomName}`}
                title="Sair da sala"
              >
                <Icon name="leave" />
              </button>
            )}
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
            aria-label={roomName ? `Mensagens de #${roomName}` : 'Mensagens'}
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
          disabledReason={status === 'connected' ? 'Entrando na sala…' : 'Sem conexão…'}
          onSend={sendMessage}
          onTyping={onActivity}
          onStopTyping={stopTyping}
        />
      </section>

      <aside className="chat__users" id="online-users" aria-label="Pessoas online">
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
