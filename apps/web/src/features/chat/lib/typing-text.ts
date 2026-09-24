import type { PublicUser } from '@chat/shared'

export interface TypingPhrases {
  one: (name: string) => string
  two: (first: string, second: string) => string
  many: () => string
}

/** "Ana está digitando..." / "Ana is typing...", for one, two or many people. */
export function typingText(
  users: readonly Pick<PublicUser, 'nickname'>[],
  phrases: TypingPhrases,
): string | null {
  const [first, second] = users
  if (!first) return null
  if (!second) return phrases.one(first.nickname)
  if (users.length === 2) return phrases.two(first.nickname, second.nickname)
  return phrases.many()
}
