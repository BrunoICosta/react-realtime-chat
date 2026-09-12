import { describe, expect, it } from 'vitest'
import { clearSession, isExpired, loadSession, saveSession } from './session-storage'

const user = { id: 'u1', nickname: 'Ana', color: '#6366f1' }

function fakeJwt(payload: Record<string, unknown>) {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

describe('session storage', () => {
  it('round-trips a session per transport mode', () => {
    const session = { token: fakeJwt({ exp: 4_102_444_800 }), user }
    saveSession('socket', session)
    expect(loadSession('socket')).toEqual(session)
    expect(loadSession('demo')).toBeNull()

    clearSession('socket')
    expect(loadSession('socket')).toBeNull()
  })

  it('drops expired tokens', () => {
    const now = Date.UTC(2026, 8, 12)
    saveSession('socket', { token: fakeJwt({ exp: now / 1000 - 60 }), user })
    expect(loadSession('socket', now)).toBeNull()
    expect(localStorage.getItem('rrc:session:socket')).toBeNull()
  })

  it('ignores corrupted entries', () => {
    localStorage.setItem('rrc:session:demo', '{not json')
    expect(loadSession('demo')).toBeNull()
  })

  it('treats tokens without exp (demo mode) as valid', () => {
    expect(isExpired('demo.123')).toBe(false)
    expect(isExpired(fakeJwt({ sub: 'x' }))).toBe(false)
  })
})
