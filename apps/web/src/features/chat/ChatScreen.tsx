import { useEffect, useState } from 'react'
import type { Theme } from '../../core/theme/use-theme'
import { Icon } from '../../shared/components/Icon'
import { ThemeToggle } from '../../shared/components/ThemeToggle'
import { Composer } from './components/Composer'
import { MessageList } from './components/MessageList'
import { RoomsSidebar } from './components/RoomsSidebar'
import { TypingIndicator } from './components/TypingIndicator'
import { useTypingEmitter } from './hooks/use-typing-emitter'
import { useActiveRoom, useChatActions, useChatState } from './state/use-chat'
import './ChatScreen.css'

interface ChatScreenProps {
  theme: Theme
  onToggleTheme: () => void
}

export function ChatScreen({ theme, onToggleTheme }: ChatScreenProps) {
  const { rooms, self, status } = useChatState()
  const { roomId, room } = useActiveRoom()
  const actions = useChatActions()
  const { sendMessage, leaveRoom, retryMessage } = actions
  const { onActivity, stopTyping } = useTypingEmitter(
    roomId,
    actions.startTyping,
    actions.stopTyping,
  )
  const [drawerOpen, setDrawerOpen] = useState(false)

  const summary = rooms.find((candidate) => candidate.id === roomId)
  const roomName = summary?.name ?? roomId ?? ''

  useEffect(() => {
    if (!drawerOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  return (
    <div className="chat" data-drawer={drawerOpen ? 'open' : undefined}>
      <aside className="chat__sidebar" id="rooms-drawer" aria-label="Salas e perfil">
        <RoomsSidebar onNavigate={() => setDrawerOpen(false)} />
      </aside>
      {drawerOpen && (
        <div className="chat__scrim" aria-hidden="true" onClick={() => setDrawerOpen(false)} />
      )}

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

        <div className="chat__body">
          <MessageList
            roomName={roomName}
            messages={room.messages}
            selfId={self.id}
            loading={room.loading}
            error={room.error}
            onRetry={retryMessage}
          />
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
    </div>
  )
}
