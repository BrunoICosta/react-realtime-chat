import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { i18n } from '../../core/i18n/i18n'
import { LANGUAGE_STORAGE_KEY } from '../../core/i18n/languages'
import { LanguageSwitcher } from './LanguageSwitcher'

describe('<LanguageSwitcher />', () => {
  it('shows one flag per language, named in its own language', () => {
    render(<LanguageSwitcher />)

    const group = screen.getByRole('radiogroup', { name: 'Idioma' })
    expect(group).toBeInTheDocument()
    const portuguese = screen.getByRole('radio', { name: 'Português (Brasil)' })
    const english = screen.getByRole('radio', { name: 'English' })

    expect(portuguese).toHaveAttribute('aria-checked', 'true')
    expect(portuguese).toHaveAttribute('lang', 'pt-BR')
    expect(portuguese).toHaveAttribute('title', 'Português (Brasil)')
    expect(english).toHaveAttribute('aria-checked', 'false')
    expect(english).toHaveAttribute('lang', 'en')
  })

  it('switches and persists the language on click', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    await user.click(screen.getByRole('radio', { name: 'English' }))

    expect(i18n.language).toBe('en')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    // The group label is translated too.
    expect(screen.getByRole('radiogroup', { name: 'Language' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'true')
  })

  it('supports the keyboard like a radio group', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    await user.tab()
    expect(screen.getByRole('radio', { name: 'Português (Brasil)' })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(i18n.language).toBe('en')
    expect(screen.getByRole('radio', { name: 'English' })).toHaveFocus()

    await user.keyboard('{ArrowLeft}')
    expect(i18n.language).toBe('pt-BR')
    expect(screen.getByRole('radio', { name: 'Português (Brasil)' })).toHaveFocus()
  })
})
