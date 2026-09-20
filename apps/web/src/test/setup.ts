import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { i18n } from '../core/i18n/i18n'

// Tests are written against pt-BR (the default language) unless they switch explicitly.
beforeEach(async () => {
  await i18n.changeLanguage('pt-BR')
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

// jsdom does not implement these; components call them for scrolling/caret handling.
Element.prototype.scrollTo ??= function scrollTo() {}
window.requestAnimationFrame ??= (callback) =>
  window.setTimeout(() => callback(performance.now()), 0)
