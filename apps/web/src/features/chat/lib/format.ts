/**
 * Locale-aware date helpers. Formatters are cached per locale because
 * `Intl.DateTimeFormat` construction is comparatively expensive.
 */
const cache = new Map<string, Intl.DateTimeFormat>()

function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  let format = cache.get(key)
  if (!format) {
    format = new Intl.DateTimeFormat(locale, options)
    cache.set(key, format)
  }
  return format
}

/** "14:05" (pt-BR) / "02:05 PM" (en) */
export function formatTime(timestamp: number, locale: string): string {
  return formatter(locale, { hour: '2-digit', minute: '2-digit' }).format(timestamp)
}

/** "sábado, 12 de setembro de 2026 às 14:05", used as tooltip. */
export function formatFullDate(timestamp: number, locale: string): string {
  return formatter(locale, { dateStyle: 'full', timeStyle: 'short' }).format(timestamp)
}

export function startOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export interface DayLabelOptions {
  locale: string
  today: string
  yesterday: string
  now?: number
}

/** "Hoje"/"Today", "Ontem"/"Yesterday", "12 de setembro"/"September 12", with the year if needed. */
export function formatDayLabel(
  timestamp: number,
  { locale, today, yesterday, now = Date.now() }: DayLabelOptions,
): string {
  const day = startOfDay(timestamp)
  const todayStart = startOfDay(now)
  if (day === todayStart) return today
  if (day === startOfDay(todayStart - 1)) return yesterday
  const sameYear = new Date(timestamp).getFullYear() === new Date(now).getFullYear()
  return formatter(locale, {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(timestamp)
}
