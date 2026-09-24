import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useErrorText } from '../../../core/i18n/error-text'
import { Icon } from '../../../shared/components/Icon'
import type { ChatNotice } from '../state/chat-context'

const VISIBLE_MS = 4_000

/** Transient feedback such as "you are sending too fast". */
export function Notice({
  notice,
  onDismiss,
}: {
  notice: ChatNotice | null
  onDismiss: () => void
}) {
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(onDismiss, VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [notice, onDismiss])

  const errorText = useErrorText()
  const { t } = useTranslation('chat')

  if (!notice) return null
  return (
    <div className="notice" role="alert">
      <Icon name="alert" size={18} />
      <span>{errorText(notice.error)}</span>
      <button type="button" className="icon-btn" onClick={onDismiss} aria-label={t('notice.close')}>
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}
