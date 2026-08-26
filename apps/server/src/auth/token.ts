import jwt from 'jsonwebtoken'
import type { PublicUser } from '@chat/shared'

interface TokenClaims {
  sub: string
  nickname: string
  color: string
}

export interface TokenService {
  sign(user: PublicUser): string
  verify(token: string): PublicUser | null
}

export function createTokenService(secret: string, expiresInSeconds: number): TokenService {
  return {
    sign(user) {
      const claims: Omit<TokenClaims, 'sub'> = { nickname: user.nickname, color: user.color }
      return jwt.sign(claims, secret, {
        subject: user.id,
        expiresIn: expiresInSeconds,
        algorithm: 'HS256',
      })
    },

    verify(token) {
      try {
        const payload = jwt.verify(token, secret, { algorithms: ['HS256'] })
        if (!isTokenClaims(payload)) return null
        return { id: payload.sub, nickname: payload.nickname, color: payload.color }
      } catch {
        return null
      }
    },
  }
}

function isTokenClaims(payload: unknown): payload is TokenClaims {
  if (typeof payload !== 'object' || payload === null) return false
  const record = payload as Record<string, unknown>
  return (
    typeof record.sub === 'string' &&
    typeof record.nickname === 'string' &&
    typeof record.color === 'string'
  )
}
