/** "Ana Souza" -> "AS", "bruno" -> "BR". */
export function initialsOf(nickname: string): string {
  const parts = nickname.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? '?'
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : (parts[0]?.[1] ?? '')
  return (first + second).toLocaleUpperCase('pt-BR')
}
