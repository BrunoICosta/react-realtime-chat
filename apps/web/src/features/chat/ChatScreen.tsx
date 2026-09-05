import { useActiveRoom, useChatActions, useChatState } from './state/use-chat'

export function ChatScreen() {
  const { rooms, status, self } = useChatState()
  const { roomId, room } = useActiveRoom()
  const { selectRoom, sendMessage, logout } = useChatActions()

  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <header>
        <strong>{self.nickname}</strong> · {status}{' '}
        <button type="button" className="btn btn--ghost" onClick={logout}>
          Sair
        </button>
      </header>
      <nav>
        {rooms.map((summary) => (
          <button
            key={summary.id}
            type="button"
            className="btn btn--ghost"
            aria-current={summary.id === roomId}
            onClick={() => selectRoom(summary.id)}
          >
            #{summary.name} ({summary.onlineCount})
          </button>
        ))}
      </nav>
      <ul>
        {room.messages.map((message) => (
          <li key={message.id}>
            <strong>{message.author.nickname}:</strong> {message.text}
          </li>
        ))}
      </ul>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const input = event.currentTarget.elements.namedItem('text') as HTMLInputElement
          sendMessage(input.value)
          input.value = ''
        }}
      >
        <input name="text" className="input" aria-label="Mensagem" />
      </form>
    </div>
  )
}
