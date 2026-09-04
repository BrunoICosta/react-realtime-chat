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

/** Small talk the simulated users post from time to time, per room. */
export const AMBIENT_LINES: Record<string, ReadonlyArray<{ user: PublicUser; text: string }>> = {
  geral: [
    { user: MARINA, text: 'Alguém mais tomando o terceiro café do dia? ☕' },
    { user: MARINA, text: 'Dica: abre esta página em outra aba e conversa com você mesmo 😄' },
    { user: MARINA, text: 'Sextou? Ainda não, mas a gente finge 🎉' },
  ],
  dev: [
    { user: DIEGO, text: 'Subi um PR com os testes do rate limiter, se alguém puder revisar 🙏' },
    {
      user: MARINA,
      text: 'TIL: BroadcastChannel funciona entre abas da mesma origem, sem servidor.',
    },
    { user: DIEGO, text: 'Socket.io com acks tipados é outro nível de DX.' },
    {
      user: MARINA,
      text: 'Quem nunca esqueceu de limpar um setTimeout no useEffect que atire a primeira pedra.',
    },
  ],
  random: [
    { user: DIEGO, text: 'Recomendação de podcast pra hoje: qualquer um sobre café 😅' },
    { user: DIEGO, text: 'Alguém viu o jogo ontem? ⚽' },
  ],
}
