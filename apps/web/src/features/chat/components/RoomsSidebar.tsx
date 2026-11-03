import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../../shared/components/Avatar'
import { DemoBadge } from '../../../shared/components/DemoBadge'
import { Icon } from '../../../shared/components/Icon'
import { useChatActions, useChatState } from '../state/use-chat'
import { CreateRoomForm } from './CreateRoomForm'
import './RoomsSidebar.css'

interface RoomsSidebarProps {
  /** Called after picking a room (closes the drawer on mobile). */
  onNavigate?: () => void
}

export function RoomsSidebar({ onNavigate }: RoomsSidebarProps) {
  const { t } = useTranslation(['chat', 'common'])
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
        {/* Title and badge wrap onto two lines when the (longer pt-BR) name does not fit. */}
        <span className="sidebar__heading-group">
          <span className="sidebar__title">{t('common:appName')}</span>
          {mode === 'demo' && <DemoBadge />}
        </span>
      </div>

      <div className="sidebar__section">
        <div className="sidebar__section-header">
          <h2 className="sidebar__heading" id="rooms-heading">
            {t('sidebar.rooms')}
            {totalUnread > 0 && (
              <span className="visually-hidden">
                {t('sidebar.unreadTotal', { count: totalUnread })}
              </span>
            )}
          </h2>
          <button
            type="button"
            className="icon-btn icon-btn--sm"
            aria-label={t('sidebar.createRoom')}
            title={t('sidebar.createRoom')}
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
              {status === 'connected' ? t('sidebar.empty') : t('sidebar.loading')}
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
                        <span
                          className="room-list__badge"
                          aria-label={t('sidebar.unread', { count: unread })}
                        >
                          {unread > 99 ? '99+' : unread}
                        </span>
                      ) : (
                        room.onlineCount > 0 && (
                          <span
                            className="room-list__online"
                            aria-label={t('sidebar.online', { count: room.onlineCount })}
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
          <span data-status={status}>{t(`sidebar.status.${status}`)}</span>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={logout}
          aria-label={t('sidebar.logout')}
          title={t('sidebar.logout')}
        >
          <Icon name="logout" size={18} />
        </button>
      </div>
    </div>
  )
}
