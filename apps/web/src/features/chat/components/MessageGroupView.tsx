import { memo } from 'react'
import { Avatar } from '../../../shared/components/Avatar'
import { Icon } from '../../../shared/components/Icon'
import { formatFullDate, formatTime } from '../lib/format'
import type { MessageGroup } from '../lib/group-messages'
import { isEmojiOnly, splitLinks } from '../lib/message-text'
import type { ChatEntry } from '../state/chat-reducer'

interface MessageGroupViewProps {
  group: MessageGroup
  isOwn: boolean
  onRetry: (clientId: string) => void
}

export const MessageGroupView = memo(function MessageGroupView({
  group,
  isOwn,
  onRetry,
}: MessageGroupViewProps) {
  return (
    <li className="msg-group" data-own={isOwn || undefined}>
      {!isOwn && <Avatar user={group.author} />}
      <div className="msg-group__body">
        <div className="msg-group__meta">
          <span
            className="msg-group__author"
            style={{ color: isOwn ? undefined : group.author.color }}
          >
            {isOwn ? 'Você' : group.author.nickname}
          </span>
          <time
            dateTime={new Date(group.startedAt).toISOString()}
            title={formatFullDate(group.startedAt)}
          >
            {formatTime(group.startedAt)}
          </time>
        </div>
        <ul className="msg-group__messages">
          {group.messages.map((message) => (
            <MessageBubble
              key={message.clientId ?? message.id}
              message={message}
              onRetry={onRetry}
            />
          ))}
        </ul>
      </div>
    </li>
  )
})

function MessageBubble({
  message,
  onRetry,
}: {
  message: ChatEntry
  onRetry: (clientId: string) => void
}) {
  const emojiOnly = isEmojiOnly(message.text)
  return (
    <li className="msg" data-status={message.status}>
      <p
        className="msg__bubble"
        data-emoji={emojiOnly || undefined}
        title={formatFullDate(message.sentAt)}
      >
        {splitLinks(message.text).map((part, index) =>
          part.kind === 'link' ? (
            <a key={index} href={part.href} target="_blank" rel="noopener noreferrer nofollow">
              {part.value}
            </a>
          ) : (
            <span key={index}>{part.value}</span>
          ),
        )}
      </p>
      {message.status === 'pending' && <span className="msg__state">enviando…</span>}
      {message.status === 'failed' && message.clientId && (
        <span className="msg__state msg__state--failed" role="status">
          <Icon name="alert" size={14} />
          Não enviada.
          <button type="button" onClick={() => message.clientId && onRetry(message.clientId)}>
            <Icon name="retry" size={14} />
            Tentar de novo
          </button>
        </span>
      )}
    </li>
  )
}
