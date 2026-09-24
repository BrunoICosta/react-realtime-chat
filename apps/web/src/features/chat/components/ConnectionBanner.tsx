import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ConnectionStatus } from '../../../core/transport/chat-transport'
import { Icon } from '../../../shared/components/Icon'
import './ConnectionBanner.css'

interface ConnectionBannerProps {
  status: ConnectionStatus
  everConnected: boolean
}

const RECOVERED_VISIBLE_MS = 2_500

/** Explains connection problems and confirms when the connection comes back. */
export function ConnectionBanner({ status, everConnected }: ConnectionBannerProps) {
  const { t } = useTranslation('chat')
  const [recovered, setRecovered] = useState(false)
  const previousRef = useRef(status)

  useEffect(() => {
    const previous = previousRef.current
    previousRef.current = status
    if (status !== 'connected' || previous !== 'reconnecting') return
    setRecovered(true)
    const timer = setTimeout(() => setRecovered(false), RECOVERED_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [status])

  let content: { tone: 'info' | 'warning' | 'success'; text: string } | null = null
  if (status === 'reconnecting' || (status === 'connecting' && everConnected)) {
    content = { tone: 'warning', text: t('connection.lost') }
  } else if (status === 'connecting') {
    content = { tone: 'info', text: t('connection.connecting') }
  } else if (status === 'connected' && recovered) {
    content = { tone: 'success', text: t('connection.recovered') }
  }

  return (
    <div className="connection-banner-slot" role="status" aria-live="polite">
      {content && (
        <div className="connection-banner" data-tone={content.tone}>
          {content.tone === 'warning' && <Icon name="wifiOff" size={16} />}
          {content.tone === 'info' && <span className="spinner" aria-hidden="true" />}
          {content.tone === 'success' && <Icon name="check" size={16} />}
          <span>{content.text}</span>
        </div>
      )}
    </div>
  )
}
