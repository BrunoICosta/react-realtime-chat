import type { PublicUser } from '@chat/shared'

/** "Ana está digitando...", "Ana e Bia estão digitando...", "Várias pessoas estão digitando..." */
export function typingText(users: readonly Pick<PublicUser, 'nickname'>[]): string | null {
  const [first, second] = users
  if (!first) return null
  if (!second) return `${first.nickname} está digitando...`
  if (users.length === 2) return `${first.nickname} e ${second.nickname} estão digitando...`
  return 'Várias pessoas estão digitando...'
}
