import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { i18n } from '../../core/i18n/i18n'
import { LANGUAGE_STORAGE_KEY } from '../../core/i18n/languages'
import { LanguageSwitcher } from './LanguageSwitcher'

describe('<LanguageSwitcher />', () => {
  it('shows the current language and switches the whole app', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    const select = screen.getByRole('combobox', { name: 'Idioma' })
    expect(select).toHaveValue('pt-BR')
    expect(screen.getByRole('option', { name: 'Português' })).toHaveAttribute('lang', 'pt-BR')

    await user.selectOptions(select, 'en')

    expect(i18n.language).toBe('en')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    // The switcher itself is translated too.
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en')
  })
})
