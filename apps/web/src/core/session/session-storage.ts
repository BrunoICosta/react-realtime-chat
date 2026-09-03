import type { Session, TransportMode } from '../transport/chat-transport'

const keyFor = (mode: TransportMode) => `rrc:session:${mode}`

/** Restores the last session for this transport mode, skipping expired JWTs. */
export function loadSession(mode: TransportMode, now = Date.now()): Session | null {
  try {
    const raw = localStorage.getItem(keyFor(mode))
    if (!raw) return null
    const session = JSON.parse(raw) as Session
    if (!session?.token || !session.user?.id) return null
    if (isExpired(session.token, now)) {
      clearSession(mode)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function saveSession(mode: TransportMode, session: Session) {
  try {
    localStorage.setItem(keyFor(mode), JSON.stringify(session))
  } catch {
    // Private mode or full storage: the session simply will not survive a reload.
  }
}

export function clearSession(mode: TransportMode) {
  try {
    localStorage.removeItem(keyFor(mode))
  } catch {
    // Nothing to clean up.
  }
}

/** Reads the `exp` claim of a JWT without verifying it (the server does that). */
export function isExpired(token: string, now = Date.now()): boolean {
  const payload = token.split('.')[1]
  if (!payload) return false
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const { exp } = JSON.parse(json) as { exp?: unknown }
    return typeof exp === 'number' && exp * 1000 <= now
  } catch {
    return false
  }
}
