import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { AVATAR_COLORS, loginSchema, validationCodeOf, type LoginResponse } from '@chat/shared'
import type { TokenService } from './token.js'

export interface LoginRouteDeps {
  tokens: TokenService
  /** Returns true when someone currently online already uses this nickname. */
  isNicknameTaken: (nickname: string) => boolean
}

export function createLoginRouter({ tokens, isNicknameTaken }: LoginRouteDeps) {
  const router = Router()

  router.post('/login', (req, res) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION',
          detail: validationCodeOf(parsed.error),
        },
      })
      return
    }

    const { nickname, color } = parsed.data
    if (isNicknameTaken(nickname)) {
      res.status(409).json({
        error: { code: 'CONFLICT' },
      })
      return
    }

    const user = {
      id: randomUUID(),
      nickname,
      color: color ?? pickColor(nickname),
    }
    const body: LoginResponse = { token: tokens.sign(user), user }
    res.status(201).json(body)
  })

  return router
}

/** Deterministic fallback so the same nickname tends to get the same color. */
function pickColor(nickname: string): string {
  let hash = 0
  for (const char of nickname) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]
}
