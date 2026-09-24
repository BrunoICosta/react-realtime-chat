import { useTranslation } from 'react-i18next'
import type { Theme } from '../../core/theme/use-theme'
import { Icon } from './Icon'

interface ThemeToggleProps {
  theme: Theme
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const { t } = useTranslation()
  const label = theme === 'dark' ? t('theme.toLight') : t('theme.toDark')
  return (
    <button type="button" className="icon-btn" onClick={onToggle} aria-label={label} title={label}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}
