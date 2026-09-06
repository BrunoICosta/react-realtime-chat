const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const fullFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'short' })
const dayFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' })
const dayWithYearFormat = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** "14:05" */
export function formatTime(timestamp: number): string {
  return timeFormat.format(timestamp)
}

/** "sábado, 12 de setembro de 2026 às 14:05" — used as tooltip. */
export function formatFullDate(timestamp: number): string {
  return fullFormat.format(timestamp)
}

export function startOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** "Hoje", "Ontem", "12 de setembro" or "12 de setembro de 2025" for other years. */
export function formatDayLabel(timestamp: number, now: number = Date.now()): string {
  const day = startOfDay(timestamp)
  const today = startOfDay(now)
  if (day === today) return 'Hoje'
  if (day === startOfDay(today - 1)) return 'Ontem'
  const sameYear = new Date(timestamp).getFullYear() === new Date(now).getFullYear()
  return (sameYear ? dayFormat : dayWithYearFormat).format(timestamp)
}
