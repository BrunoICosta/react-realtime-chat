import type { PublicUser } from '@chat/shared'

/** The bot that answers in #geral. */
export const BOT_USER: PublicUser = { id: 'demo-bot-lia', nickname: 'Lia (bot)', color: '#a855f7' }

export const MARINA: PublicUser = { id: 'demo-sim-marina', nickname: 'Marina', color: '#ec4899' }
export const DIEGO: PublicUser = { id: 'demo-sim-diego', nickname: 'Diego', color: '#0ea5e9' }

/** Simulated people that are always "online" in some rooms so the demo never feels empty. */
export const SIMULATED_PRESENCE: ReadonlyArray<{ user: PublicUser; rooms: readonly string[] }> = [
  { user: BOT_USER, rooms: ['geral'] },
  { user: MARINA, rooms: ['geral', 'dev'] },
  { user: DIEGO, rooms: ['dev', 'random'] },
]

export function simulatedUsersIn(roomId: string): PublicUser[] {
  return SIMULATED_PRESENCE.filter((entry) => entry.rooms.includes(roomId)).map(
    (entry) => entry.user,
  )
}

export function isReservedNickname(nickname: string): boolean {
  const wanted = nickname.trim().toLocaleLowerCase('pt-BR')
  return SIMULATED_PRESENCE.some(
    ({ user }) =>
      user.nickname.toLocaleLowerCase('pt-BR') === wanted ||
      user.nickname.toLocaleLowerCase('pt-BR').startsWith(`${wanted} `),
  )
}
