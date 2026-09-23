import { LIMITS, type ValidationCode } from '@chat/shared'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toErrorInfo, type ErrorInfo } from '../transport/chat-transport'

export type ErrorContext = 'nickname' | 'room'

/** Min/max interpolated into the validation messages (each message uses what it needs). */
const nickname = { min: LIMITS.nicknameMin, max: LIMITS.nicknameMax }
const roomName = { min: LIMITS.roomNameMin, max: LIMITS.roomNameMax }
const message = { min: 1, max: LIMITS.messageMax }
const LIMIT_VALUES: Record<ValidationCode, { min: number; max: number }> = {
  NICKNAME_TOO_SHORT: nickname,
  NICKNAME_TOO_LONG: nickname,
  NICKNAME_INVALID_CHARS: nickname,
  COLOR_INVALID: nickname,
  ROOM_NAME_TOO_SHORT: roomName,
  ROOM_NAME_TOO_LONG: roomName,
  ROOM_NAME_INVALID_CHARS: roomName,
  MESSAGE_EMPTY: message,
  MESSAGE_TOO_LONG: message,
  INVALID_PAYLOAD: message,
}

/**
 * Turns an error code (from the server, the demo transport or client-side validation)
 * into a sentence in the active language. `context` disambiguates codes such as CONFLICT.
 */
export function useErrorText() {
  const { t } = useTranslation('errors')

  return useCallback(
    (error: ErrorInfo | unknown, context?: ErrorContext): string => {
      const info = isErrorInfo(error) ? error : toErrorInfo(error)
      if (info.code === 'VALIDATION' && info.detail) {
        return t(`validation.${info.detail}`, LIMIT_VALUES[info.detail])
      }
      if (info.code === 'CONFLICT' && context) return t(`conflict.${context}`)
      return t(`codes.${info.code}`)
    },
    [t],
  )
}

function isErrorInfo(value: unknown): value is ErrorInfo {
  return typeof value === 'object' && value !== null && 'code' in value && !(value instanceof Error)
}
