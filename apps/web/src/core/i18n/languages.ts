export const SUPPORTED_LANGUAGES = ['pt-BR', 'en'] as const

export type Language = (typeof SUPPORTED_LANGUAGES)[number]

export const DEFAULT_LANGUAGE: Language = 'pt-BR'

/** localStorage key that keeps the visitor's choice. */
export const LANGUAGE_STORAGE_KEY = 'rrc:lang'

/** Names shown in the switcher, always in their own language. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  'pt-BR': 'Português',
  en: 'English',
}

/** Any Portuguese variant maps to pt-BR, everything else to English. */
export function toSupportedLanguage(code: string | null | undefined): Language {
  if (!code) return DEFAULT_LANGUAGE
  return code.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
}

export function isLanguage(value: unknown): value is Language {
  return SUPPORTED_LANGUAGES.includes(value as Language)
}
