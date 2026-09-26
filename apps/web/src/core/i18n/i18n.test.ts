import { createInstance } from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { i18n, i18nOptions } from './i18n'
import { LANGUAGE_STORAGE_KEY, toSupportedLanguage } from './languages'

/** A fresh instance runs the real detector with the app options, like a first page load. */
async function detect() {
  const instance = createInstance()
  await instance.use(LanguageDetector).init(i18nOptions)
  return instance.language
}

function mockBrowserLanguages(languages: string[]) {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages)
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(languages[0] ?? '')
}

describe('language detection', () => {
  afterEach(() => vi.restoreAllMocks())

  it.each([
    ['pt-BR', 'pt-BR'],
    ['pt-PT', 'pt-BR'],
    ['pt', 'pt-BR'],
    ['en-US', 'en'],
    ['es-AR', 'en'],
    ['', 'pt-BR'],
  ])('maps %j to %s', (code, expected) => {
    expect(toSupportedLanguage(code)).toBe(expected)
  })

  it('prefers the saved choice over the browser language', async () => {
    mockBrowserLanguages(['pt-BR'])
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en')
    expect(await detect()).toBe('en')
  })

  it('falls back to the browser language', async () => {
    mockBrowserLanguages(['pt-PT', 'en'])
    expect(await detect()).toBe('pt-BR')
    // Detection caches the result, as on a real first visit.
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('pt-BR')

    localStorage.clear()
    mockBrowserLanguages(['de-DE'])
    expect(await detect()).toBe('en')
  })

  it('uses pt-BR when nothing is known', async () => {
    mockBrowserLanguages([])
    expect(await detect()).toBe('pt-BR')
  })
})

describe('language changes', () => {
  it('persists the choice and updates <html lang>', async () => {
    await i18n.changeLanguage('en')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
    expect(document.documentElement.lang).toBe('en')

    await i18n.changeLanguage('pt-BR')
    expect(document.documentElement.lang).toBe('pt-BR')
  })

  it('has the same keys in every language', () => {
    const keys = (value: object, prefix = ''): string[] =>
      Object.entries(value).flatMap(([key, child]) =>
        typeof child === 'object' && child !== null
          ? keys(child, `${prefix}${key}.`)
          : [`${prefix}${key}`],
      )
    const { resources } = i18nOptions
    expect(keys(resources.en).sort()).toEqual(keys(resources['pt-BR']).sort())
  })
})
