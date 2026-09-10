import { useEffect } from 'react'
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

  if (!notice) return null
  return (
    <div className="notice" role="alert">
      <Icon name="alert" size={18} />
      <span>{notice.text}</span>
      <button type="button" className="icon-btn" onClick={onDismiss} aria-label="Fechar aviso">
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}
