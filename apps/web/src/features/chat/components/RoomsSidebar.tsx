import { useState } from 'react'
import { Avatar } from '../../../shared/components/Avatar'
import { DemoBadge } from '../../../shared/components/DemoBadge'
import { Icon } from '../../../shared/components/Icon'
import { useChatActions, useChatState } from '../state/use-chat'
import { CreateRoomForm } from './CreateRoomForm'
import './RoomsSidebar.css'

const STATUS_LABEL = {
  idle: 'desconectado',
  connecting: 'conectando…',
  connected: 'online',
  reconnecting: 'reconectando…',
  offline: 'offline',
} as const

interface RoomsSidebarProps {
  /** Called after picking a room (closes the drawer on mobile). */
  onNavigate?: () => void
}

export function RoomsSidebar({ onNavigate }: RoomsSidebarProps) {
  const { rooms, activeRoomId, byRoom, self, status, mode } = useChatState()
  const { selectRoom, createRoom, logout } = useChatActions()
  const [creating, setCreating] = useState(false)

  const totalUnread = Object.values(byRoom).reduce((sum, room) => sum + room.unread, 0)

  return (
    <div className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__logo" aria-hidden="true">
          <Icon name="sparkles" size={18} />
        </span>
        <span className="sidebar__title">Realtime Chat</span>
        {mode === 'demo' && <DemoBadge />}
      </div>

      <div className="sidebar__section">
        <div className="sidebar__section-header">
          <h2 className="sidebar__heading" id="rooms-heading">
            Salas
            {totalUnread > 0 && <span className="visually-hidden">, {totalUnread} não lidas</span>}
          </h2>
          <button
            type="button"
            className="icon-btn icon-btn--sm"
            aria-label="Criar nova sala"
            title="Criar nova sala"
            aria-expanded={creating}
            onClick={() => setCreating((open) => !open)}
          >
            <Icon name={creating ? 'close' : 'plus'} size={18} />
          </button>
        </div>

        {creating && (
          <CreateRoomForm
            onCreate={async (name) => {
              await createRoom(name)
              onNavigate?.()
            }}
            onClose={() => setCreating(false)}
          />
        )}

        <nav aria-labelledby="rooms-heading">
          {rooms.length === 0 ? (
            <p className="sidebar__empty">
              {status === 'connected' ? 'Nenhuma sala ainda.' : 'Carregando salas…'}
            </p>
          ) : (
            <ul className="room-list">
              {rooms.map((room) => {
                const unread = byRoom[room.id]?.unread ?? 0
                const active = room.id === activeRoomId
                return (
                  <li key={room.id}>
                    <button
                      type="button"
                      className="room-list__item"
                      aria-current={active ? 'page' : undefined}
                      data-unread={unread > 0 || undefined}
                      onClick={() => {
                        selectRoom(room.id)
                        onNavigate?.()
                      }}
                    >
                      <Icon name="hash" size={16} className="room-list__hash" />
                      <span className="room-list__name">{room.name}</span>
                      {unread > 0 ? (
                        <span className="room-list__badge" aria-label={unreadLabel(unread)}>
                          {unread > 99 ? '99+' : unread}
                        </span>
                      ) : (
                        room.onlineCount > 0 && (
                          <span
                            className="room-list__online"
                            aria-label={`${room.onlineCount} online`}
                          >
                            {room.onlineCount}
                          </span>
                        )
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </nav>
      </div>

      <div className="sidebar__me">
        <Avatar user={self} online={status === 'connected'} />
        <div className="sidebar__me-info">
          <strong>{self.nickname}</strong>
          <span data-status={status}>{STATUS_LABEL[status]}</span>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={logout}
          aria-label="Sair do chat"
          title="Sair do chat"
        >
          <Icon name="logout" size={18} />
        </button>
      </div>
    </div>
  )
}

function unreadLabel(count: number) {
  return count === 1 ? '1 mensagem não lida' : `${count} mensagens não lidas`
}
