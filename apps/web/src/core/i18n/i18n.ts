import i18n, { type InitOptions } from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  toSupportedLanguage,
  type Language,
} from './languages'
import { en } from './locales/en'
import { ptBR } from './locales/pt-BR'

export const resources = { 'pt-BR': ptBR, en } as const

/**
 * Initial language: saved choice > browser language (pt* -> pt-BR, else en) > pt-BR.
 * The choice is cached in localStorage and mirrored on `<html lang>`.
 */
export const i18nOptions = {
  resources,
  supportedLngs: [...SUPPORTED_LANGUAGES],
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: 'common',
  ns: Object.keys(ptBR),
  detection: {
    order: ['localStorage', 'navigator'],
    lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    caches: ['localStorage'],
    convertDetectedLanguage: toSupportedLanguage,
  },
  interpolation: { escapeValue: false },
} satisfies InitOptions

void i18n.use(LanguageDetector).use(initReactI18next).init(i18nOptions)

function syncDocumentLanguage(language: string) {
  if (typeof document !== 'undefined') document.documentElement.lang = language
}

syncDocumentLanguage(i18n.language)
i18n.on('languageChanged', syncDocumentLanguage)

/** The active language, normalized to one of the supported ones. */
export function currentLanguage(): Language {
  return toSupportedLanguage(i18n.resolvedLanguage ?? i18n.language)
}

export { i18n }
