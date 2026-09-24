import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useErrorText } from '../../../core/i18n/error-text'
import type { ErrorInfo } from '../../../core/transport/chat-transport'
import { Icon } from '../../../shared/components/Icon'
import { formatDayLabel } from '../lib/format'
import { buildTimeline } from '../lib/group-messages'
import type { ChatEntry } from '../state/chat-reducer'
import { MessageGroupView } from './MessageGroupView'
import './MessageList.css'

interface MessageListProps {
  roomName: string
  messages: ChatEntry[]
  selfId: string
  loading: boolean
  error: ErrorInfo | null
  onRetry: (clientId: string) => void
}

export function MessageList({
  roomName,
  messages,
  selfId,
  loading,
  error,
  onRetry,
}: MessageListProps) {
  const { t, i18n } = useTranslation('chat')
  const locale = i18n.language
  const today = t('messages.today')
  const yesterday = t('messages.yesterday')
  const timeline = useMemo(
    () =>
      buildTimeline(messages, (timestamp) =>
        formatDayLabel(timestamp, { locale, today, yesterday }),
      ),
    [messages, locale, today, yesterday],
  )
  const errorText = useErrorText()

  if (error && messages.length === 0) {
    return (
      <div className="messages__state">
        <p className="alert alert--error" role="alert">
          <Icon name="alert" size={18} />
          {errorText(error)}
        </p>
      </div>
    )
  }

  if (loading && messages.length === 0) {
    return (
      <div className="messages__state" aria-busy="true">
        <div className="messages__skeleton" aria-hidden="true">
          {[0, 1, 2].map((key) => (
            <div key={key} className="messages__skeleton-row">
              <span />
              <div>
                <span />
                <span />
              </div>
            </div>
          ))}
        </div>
        <span className="visually-hidden">{t('messages.loading')}</span>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="messages__state messages__empty">
        <span className="messages__empty-icon" aria-hidden="true">
          👋
        </span>
        <p>{t('messages.empty', { room: roomName })}</p>
        <p>{t('messages.emptyHint')}</p>
      </div>
    )
  }

  return (
    <ol className="messages__timeline">
      {timeline.map((item) =>
        item.kind === 'day' ? (
          <li key={item.id} className="messages__day" role="separator">
            <span>{item.label}</span>
          </li>
        ) : (
          <MessageGroupView
            key={item.id}
            group={item.group}
            isOwn={item.group.author.id === selfId}
            onRetry={onRetry}
          />
        ),
      )}
    </ol>
  )
}
