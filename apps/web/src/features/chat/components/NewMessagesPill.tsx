import { Icon } from '../../../shared/components/Icon'

interface NewMessagesPillProps {
  count: number
  onClick: () => void
}

export function NewMessagesPill({ count, onClick }: NewMessagesPillProps) {
  if (count <= 0) return null
  const label = count === 1 ? '1 nova mensagem' : `${count > 99 ? '99+' : count} novas mensagens`
  return (
    <button type="button" className="new-messages-pill" onClick={onClick}>
      <Icon name="arrowDown" size={16} />
      {label}
    </button>
  )
}
