import { useRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LANGUAGE_NAMES,
  SUPPORTED_LANGUAGES,
  toSupportedLanguage,
  type Language,
} from '../../core/i18n/languages'
import { Flag } from './Flag'
import './LanguageSwitcher.css'

/**
 * Two flag buttons acting as a radio group (a native <select> cannot show SVG).
 * Tab reaches the active flag; arrow keys move and select, like any radio group.
 */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const current = toSupportedLanguage(i18n.resolvedLanguage ?? i18n.language)
  const buttons = useRef<Partial<Record<Language, HTMLButtonElement | null>>>({})

  function select(language: Language) {
    if (language !== current) void i18n.changeLanguage(language)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (step === undefined) return
    event.preventDefault()
    const index = SUPPORTED_LANGUAGES.indexOf(current)
    const count = SUPPORTED_LANGUAGES.length
    const next = SUPPORTED_LANGUAGES[(index + step + count) % count]
    if (!next) return
    select(next)
    buttons.current[next]?.focus()
  }

  return (
    <div
      className="lang-switcher"
      role="radiogroup"
      aria-label={t('language.label')}
      onKeyDown={handleKeyDown}
    >
      {SUPPORTED_LANGUAGES.map((language) => {
        const active = language === current
        return (
          <button
            key={language}
            ref={(element) => {
              buttons.current[language] = element
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            lang={language}
            aria-label={LANGUAGE_NAMES[language]}
            title={LANGUAGE_NAMES[language]}
            className="lang-switcher__option"
            onClick={() => select(language)}
          >
            <Flag language={language} />
          </button>
        )
      })}
    </div>
  )
}
