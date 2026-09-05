import type { Theme } from '../../core/theme/use-theme'
import { Icon } from './Icon'

interface ThemeToggleProps {
  theme: Theme
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const label = theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'
  return (
    <button type="button" className="icon-btn" onClick={onToggle} aria-label={label} title={label}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}
