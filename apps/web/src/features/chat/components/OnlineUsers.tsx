import type { PublicUser } from '@chat/shared'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../../shared/components/Avatar'
import { Icon } from '../../../shared/components/Icon'
import './OnlineUsers.css'

interface OnlineUsersProps {
  users: PublicUser[]
  typing: PublicUser[]
  selfId: string
  roomName: string
  onClose: () => void
}

export function OnlineUsers({ users, typing, selfId, roomName, onClose }: OnlineUsersProps) {
  const { t } = useTranslation('chat')
  const typingIds = new Set(typing.map((user) => user.id))
  // You first, then everyone else alphabetically (the server already sorts them).
  const sorted = [...users].sort((a, b) => Number(b.id === selfId) - Number(a.id === selfId))

  return (
    <div className="online">
      <div className="online__header">
        <h2 className="online__title" id="online-heading">
          {t('online.title', { room: roomName })}{' '}
          <span className="online__count">{users.length}</span>
        </h2>
        <button
          type="button"
          className="icon-btn icon-btn--sm online__close"
          aria-label={t('online.close')}
          onClick={onClose}
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="online__empty">{t('online.empty')}</p>
      ) : (
        <ul className="online__list" aria-labelledby="online-heading">
          {sorted.map((user) => (
            <li key={user.id} className="online__item">
              <Avatar user={user} size="sm" online />
              <span className="online__name">{user.nickname}</span>
              {user.id === selfId && <span className="online__tag">{t('online.you')}</span>}
              {typingIds.has(user.id) && (
                <span className="online__typing" title={t('online.typing')}>
                  <span className="visually-hidden">{t('online.typing')}</span>
                  <span aria-hidden="true">✍️</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
