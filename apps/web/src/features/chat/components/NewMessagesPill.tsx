import { useTranslation } from 'react-i18next'
import { Icon } from '../../../shared/components/Icon'

interface NewMessagesPillProps {
  count: number
  onClick: () => void
}

export function NewMessagesPill({ count, onClick }: NewMessagesPillProps) {
  const { t } = useTranslation('chat')
  if (count <= 0) return null
  return (
    <button type="button" className="new-messages-pill" onClick={onClick}>
      <Icon name="arrowDown" size={16} />
      {t('messages.newMessages', { count: Math.min(count, 99) })}
    </button>
  )
}
