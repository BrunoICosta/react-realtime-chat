import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { i18n } from '../../../core/i18n/i18n'
import { TypingIndicator } from './TypingIndicator'

const user = (id: string, nickname: string) => ({ id, nickname, color: '#6366f1' })

describe('<TypingIndicator />', () => {
  it('follows the active language', async () => {
    const { rerender } = render(<TypingIndicator users={[user('1', 'Fulano')]} />)
    expect(screen.getByText('Fulano está digitando...')).toBeInTheDocument()

    await act(() => i18n.changeLanguage('en'))
    expect(screen.getByText('Fulano is typing...')).toBeInTheDocument()

    rerender(<TypingIndicator users={[user('1', 'Ana'), user('2', 'Bia')]} />)
    expect(screen.getByText('Ana and Bia are typing...')).toBeInTheDocument()

    rerender(<TypingIndicator users={[user('1', 'Ana'), user('2', 'Bia'), user('3', 'Caio')]} />)
    expect(screen.getByText('Several people are typing...')).toBeInTheDocument()
  })

  it('renders nothing visible when nobody is typing', () => {
    const { container } = render(<TypingIndicator users={[]} />)
    expect(container.textContent).toBe('')
  })
})
