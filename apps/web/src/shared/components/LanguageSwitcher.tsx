import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, toSupportedLanguage } from '../../core/i18n/languages'
import './LanguageSwitcher.css'

/** Native select (keyboard and screen reader friendly) styled as a compact pill. */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const id = useId()
  const current = toSupportedLanguage(i18n.resolvedLanguage ?? i18n.language)

  return (
    <div className="lang-switcher">
      <label htmlFor={id} className="visually-hidden">
        {t('language.label')}
      </label>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        className="lang-switcher__icon"
      >
        <path
          d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <select
        id={id}
        className="lang-switcher__select"
        value={current}
        title={t('language.label')}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <option key={language} value={language} lang={language}>
            {LANGUAGE_NAMES[language]}
          </option>
        ))}
      </select>
    </div>
  )
}
