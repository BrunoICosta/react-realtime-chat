import { useMemo } from 'react'
import { Icon } from '../../../shared/components/Icon'
import { buildTimeline } from '../lib/group-messages'
import type { ChatEntry } from '../state/chat-reducer'
import { MessageGroupView } from './MessageGroupView'
import './MessageList.css'

interface MessageListProps {
  roomName: string
  messages: ChatEntry[]
  selfId: string
  loading: boolean
  error: string | null
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
  const timeline = useMemo(() => buildTimeline(messages), [messages])

  if (error && messages.length === 0) {
    return (
      <div className="messages__state">
        <p className="alert alert--error" role="alert">
          <Icon name="alert" size={18} />
          {error}
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
        <span className="visually-hidden">Carregando mensagens…</span>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="messages__state messages__empty">
        <span className="messages__empty-icon" aria-hidden="true">
          👋
        </span>
        <p>
          Nenhuma mensagem em <strong>#{roomName}</strong> ainda.
        </p>
        <p>Que tal dizer oi?</p>
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
