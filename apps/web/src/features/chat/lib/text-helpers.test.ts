import { describe, expect, it } from 'vitest'
import { initialsOf } from '../../../shared/lib/initials'
import { formatDayLabel, formatTime } from './format'
import { isEmojiOnly, splitLinks } from './message-text'
import { typingText } from './typing-text'

describe('typingText', () => {
  const user = (nickname: string) => ({ nickname })
  const phrases = {
    one: (name: string) => `${name} está digitando...`,
    two: (first: string, second: string) => `${first} e ${second} estão digitando...`,
    many: () => 'Várias pessoas estão digitando...',
  }

  it('handles zero, one, two and many people', () => {
    expect(typingText([], phrases)).toBeNull()
    expect(typingText([user('Fulano')], phrases)).toBe('Fulano está digitando...')
    expect(typingText([user('Ana'), user('Bia')], phrases)).toBe('Ana e Bia estão digitando...')
    expect(typingText([user('Ana'), user('Bia'), user('Caio')], phrases)).toBe(
      'Várias pessoas estão digitando...',
    )
  })
})

describe('pt-BR formatting', () => {
  const now = new Date(2026, 8, 12, 18, 30).getTime()
  const labels = { locale: 'pt-BR', today: 'Hoje', yesterday: 'Ontem', now }

  it('formats times as HH:mm', () => {
    expect(formatTime(new Date(2026, 8, 12, 9, 5).getTime(), 'pt-BR')).toBe('09:05')
    expect(formatTime(new Date(2026, 8, 12, 21, 5).getTime(), 'en')).toBe('09:05 PM')
  })

  it('labels days relative to today', () => {
    expect(formatDayLabel(new Date(2026, 8, 12, 8).getTime(), labels)).toBe('Hoje')
    expect(formatDayLabel(new Date(2026, 8, 11, 23).getTime(), labels)).toBe('Ontem')
    expect(formatDayLabel(new Date(2026, 8, 1).getTime(), labels)).toBe('1 de setembro')
    expect(formatDayLabel(new Date(2025, 11, 25).getTime(), labels)).toBe('25 de dezembro de 2025')
  })

  it('uses English labels and month names in English', () => {
    const english = { locale: 'en', today: 'Today', yesterday: 'Yesterday', now }
    expect(formatDayLabel(new Date(2026, 8, 12, 8).getTime(), english)).toBe('Today')
    expect(formatDayLabel(new Date(2026, 8, 1).getTime(), english)).toBe('September 1')
    expect(formatDayLabel(new Date(2025, 11, 25).getTime(), english)).toBe('December 25, 2025')
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
