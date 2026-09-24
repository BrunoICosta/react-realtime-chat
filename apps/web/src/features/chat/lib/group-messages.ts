import type { PublicUser } from '@chat/shared'
import type { ChatEntry } from '../state/chat-reducer'
import { startOfDay } from './format'

/** Consecutive messages from the same author closer than this are shown as one group. */
export const GROUP_GAP_MS = 5 * 60_000

export interface MessageGroup {
  id: string
  author: PublicUser
  startedAt: number
  messages: ChatEntry[]
}

export type TimelineItem =
  { kind: 'day'; id: string; label: string } | { kind: 'group'; id: string; group: MessageGroup }

/**
 * Turns a flat, chronological message list into day separators + author groups,
 * the way most chat apps render a conversation.
 */
export function buildTimeline(
  messages: readonly ChatEntry[],
  /** Builds the separator text for a day, e.g. "Hoje" or "12 de setembro" (see formatDayLabel). */
  dayLabel: (timestamp: number) => string,
  gapMs: number = GROUP_GAP_MS,
): TimelineItem[] {
  const items: TimelineItem[] = []
  let currentDay: number | null = null
  let group: MessageGroup | null = null

  for (const message of messages) {
    const day = startOfDay(message.sentAt)
    if (day !== currentDay) {
      currentDay = day
      group = null
      items.push({ kind: 'day', id: `day-${day}`, label: dayLabel(message.sentAt) })
    }

    const last = group?.messages[group.messages.length - 1]
    const continues =
      group !== null &&
      last !== undefined &&
      group.author.id === message.author.id &&
      message.sentAt - last.sentAt <= gapMs

    if (continues && group) {
      group.messages.push(message)
    } else {
      group = {
        id: `group-${message.id}`,
        author: message.author,
        startedAt: message.sentAt,
        messages: [message],
      }
      items.push({ kind: 'group', id: group.id, group })
    }
  }

  return items
}
