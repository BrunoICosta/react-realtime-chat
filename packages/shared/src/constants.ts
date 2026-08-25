/** Limits shared by the server (enforcement) and the web app (UX hints). */
export const LIMITS = {
  nicknameMin: 2,
  nicknameMax: 24,
  roomNameMin: 2,
  roomNameMax: 32,
  messageMax: 1000,
  /** How many messages each room keeps in memory. */
  historyPerRoom: 100,
  maxRooms: 50,
} as const

/** Typing state expires on the server if the client never sends `typing:stop`. */
export const TYPING_TIMEOUT_MS = 5_000

export const DEFAULT_ROOMS = [
  { id: 'geral', name: 'geral' },
  { id: 'dev', name: 'dev' },
  { id: 'random', name: 'random' },
] as const

/** Avatar palette offered on the login screen. Any `#rrggbb` color is accepted by the API. */
export const AVATAR_COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#14b8a6',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#ef4444',
  '#ec4899',
  '#a855f7',
] as const
