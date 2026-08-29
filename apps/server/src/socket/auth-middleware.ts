import { UNAUTHORIZED_ERROR } from '@chat/shared'
import type { TokenService } from '../auth/token.js'
import type { ChatSocket } from './types.js'

/**
 * Rejects the handshake unless `auth.token` carries a valid JWT issued by `/api/login`.
 * The decoded user is stored in `socket.data` so handlers never trust client-sent identity.
 */
export function createAuthMiddleware(tokens: TokenService) {
  return (socket: ChatSocket, next: (err?: Error) => void) => {
    const auth: unknown = socket.handshake.auth
    const token =
      typeof auth === 'object' && auth !== null && 'token' in auth ? auth.token : undefined

    const user = typeof token === 'string' ? tokens.verify(token) : null
    if (!user) {
      next(new Error(UNAUTHORIZED_ERROR))
      return
    }

    socket.data.user = user
    next()
  }
}
