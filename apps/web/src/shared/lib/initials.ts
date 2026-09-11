/** "Ana Souza" -> "AS", "bruno" -> "BR", "Lia (bot)" -> "LB". Punctuation is ignored. */
export function initialsOf(nickname: string): string {
  const words = nickname
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean)
  const first = words[0]
  if (!first) return '?'
  const last = words.length > 1 ? words[words.length - 1] : undefined
  const initials = last ? `${first[0]}${last[0]}` : first.slice(0, 2)
  return initials.toLocaleUpperCase('pt-BR')
}
