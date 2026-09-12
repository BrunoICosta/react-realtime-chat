import { describe, expect, it } from 'vitest'
import { initialsOf } from '../../../shared/lib/initials'
import { formatDayLabel, formatTime } from './format'
import { isEmojiOnly, splitLinks } from './message-text'
import { typingText } from './typing-text'

describe('typingText', () => {
  const user = (nickname: string) => ({ nickname })

  it('handles zero, one, two and many people', () => {
    expect(typingText([])).toBeNull()
    expect(typingText([user('Fulano')])).toBe('Fulano está digitando...')
    expect(typingText([user('Ana'), user('Bia')])).toBe('Ana e Bia estão digitando...')
    expect(typingText([user('Ana'), user('Bia'), user('Caio')])).toBe(
      'Várias pessoas estão digitando...',
    )
  })
})

describe('pt-BR formatting', () => {
  const now = new Date(2026, 8, 12, 18, 30).getTime()

  it('formats times as HH:mm', () => {
    expect(formatTime(new Date(2026, 8, 12, 9, 5).getTime())).toBe('09:05')
  })

  it('labels days relative to today', () => {
    expect(formatDayLabel(new Date(2026, 8, 12, 8).getTime(), now)).toBe('Hoje')
    expect(formatDayLabel(new Date(2026, 8, 11, 23).getTime(), now)).toBe('Ontem')
    expect(formatDayLabel(new Date(2026, 8, 1).getTime(), now)).toBe('1 de setembro')
    expect(formatDayLabel(new Date(2025, 11, 25).getTime(), now)).toBe('25 de dezembro de 2025')
  })
})

describe('message text', () => {
  it('extracts links without trailing punctuation', () => {
    expect(splitLinks('veja https://vite.dev/guide, ficou ótimo')).toEqual([
      { kind: 'text', value: 'veja ' },
      { kind: 'link', value: 'https://vite.dev/guide', href: 'https://vite.dev/guide' },
      { kind: 'text', value: ', ficou ótimo' },
    ])
  })

  it('does not turn other schemes into links', () => {
    expect(splitLinks('javascript:alert(1)')).toEqual([
      { kind: 'text', value: 'javascript:alert(1)' },
    ])
  })

  it('detects short emoji-only messages', () => {
    expect(isEmojiOnly('👍')).toBe(true)
    expect(isEmojiOnly('❤️ 🔥')).toBe(true)
    expect(isEmojiOnly('👨‍👩‍👧')).toBe(true)
    expect(isEmojiOnly('ok 👍')).toBe(false)
    expect(isEmojiOnly('😀😀😀😀')).toBe(false)
  })
})

describe('initialsOf', () => {
  it.each([
    ['Ana Souza', 'AS'],
    ['bruno', 'BR'],
    ['Lia (bot)', 'LB'],
    ['  maria   da silva ', 'MS'],
    ['!!!', '?'],
  ])('%s -> %s', (nickname, expected) => {
    expect(initialsOf(nickname)).toBe(expected)
  })
})
