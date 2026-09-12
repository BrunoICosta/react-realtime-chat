import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

// jsdom does not implement these; components call them for scrolling/caret handling.
Element.prototype.scrollTo ??= function scrollTo() {}
window.requestAnimationFrame ??= (callback) =>
  window.setTimeout(() => callback(performance.now()), 0)
