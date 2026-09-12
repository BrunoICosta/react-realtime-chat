import { describe, expect, it } from 'vitest'
import { botReply } from './demo-bot'

const author = { id: 'u1', nickname: 'Bruno', color: '#6366f1' }
const context = { now: new Date(2026, 8, 12, 14, 7), random: () => 0 }

describe('botReply', () => {
  it('greets by nickname, including accented greetings', () => {
    expect(botReply('olá!', author, context)).toBe('Oi, Bruno! 👋 Que bom te ver por aqui.')
    expect(botReply('E aí, tudo bem?', author, context)).toContain('Oi, Bruno!')
  })

  it('answers commands even when they come after a greeting', () => {
    expect(botReply('oi, me conta uma piada?', author, context)).toContain('JavaScript')
    expect(botReply('oi! que horas são?', author, context)).toBe('Agora são 14:07 por aqui ⏰')
  })

  it('explains the demo mode on "ajuda"', () => {
    expect(botReply('ajuda', author, context)).toContain('BroadcastChannel')
  })

  it('does not match words inside other words', () => {
    // "oito" contains "oi" but is not a greeting.
    expect(botReply('comprei oito bananas', author, context)).toBe('Interessante! Conta mais 👀')
  })

  it('falls back to a generic reply chosen by the random source', () => {
    expect(botReply('xyz', author, { ...context, random: () => 0.99 })).toContain('ajuda')
  })
})
