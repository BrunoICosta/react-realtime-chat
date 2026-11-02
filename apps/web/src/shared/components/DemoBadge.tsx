import { useTranslation } from 'react-i18next'
import './DemoBadge.css'

/** Tells the visitor this build has no server behind it (static demo deployment). */
export function DemoBadge() {
  const { t } = useTranslation()
  return (
    <span className="demo-badge" title={t('demo.tooltip')}>
      <span className="demo-badge__dot" aria-hidden="true" />
      {t('demo.badge')}
    </span>
  )
}
