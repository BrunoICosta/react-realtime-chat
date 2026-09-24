import { describe, expect, it } from 'vitest'
import type { ChatEntry } from '../state/chat-reducer'
import { formatDayLabel } from './format'
import { buildTimeline } from './group-messages'

const ana = { id: 'ana', nickname: 'Ana', color: '#6366f1' }
const bia = { id: 'bia', nickname: 'Bia', color: '#22c55e' }

const NOW = new Date(2026, 8, 12, 15, 0).getTime()
const MIN = 60_000
const dayLabel = (timestamp: number) =>
  formatDayLabel(timestamp, { locale: 'pt-BR', today: 'Hoje', yesterday: 'Ontem', now: NOW })

let seq = 0
function msg(author: typeof ana, sentAt: number, text = 'oi'): ChatEntry {
  seq += 1
  return { id: `m${seq}`, roomId: 'geral', author, text, sentAt, status: 'sent' }
}

describe('buildTimeline', () => {
  it('returns nothing for an empty conversation', () => {
    expect(buildTimeline([], dayLabel)).toEqual([])
  })

  it('groups consecutive messages from the same author', () => {
    const items = buildTimeline(
      [msg(ana, NOW - 10 * MIN), msg(ana, NOW - 9 * MIN), msg(bia, NOW - 8 * MIN)],
      dayLabel,
    )
    expect(items.map((item) => item.kind)).toEqual(['day', 'group', 'group'])
    const [, first, second] = items
    expect(first?.kind === 'group' && first.group.messages).toHaveLength(2)
    expect(second?.kind === 'group' && second.group.author).toEqual(bia)
  })

  it('starts a new group after a long pause', () => {
    const items = buildTimeline([msg(ana, NOW - 30 * MIN), msg(ana, NOW - 2 * MIN)], dayLabel)
    expect(items.filter((item) => item.kind === 'group')).toHaveLength(2)
  })

  it('splits groups and adds a separator when the day changes', () => {
    const yesterday = NOW - 24 * 60 * MIN
    const items = buildTimeline([msg(ana, yesterday), msg(ana, NOW - MIN)], dayLabel)
    expect(items.map((item) => (item.kind === 'day' ? item.label : 'group'))).toEqual([
      'Ontem',
      'group',
      'Hoje',
      'group',
    ])
  })
})
