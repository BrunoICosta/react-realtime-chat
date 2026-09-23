import { z } from 'zod'
import { LIMITS } from './constants.js'

const HEX_COLOR = /^#[0-9a-f]{6}$/i
const NICKNAME = /^[\p{L}\p{N} _.-]+$/u
const ROOM_NAME = /^[\p{L}\p{N} _-]+$/u

/**
 * Validation failures are reported as codes, never as text: the web app translates them
 * (see `errors.validation.*` in its locale files) and the server stays language-agnostic.
 */
export const VALIDATION_CODES = [
  'NICKNAME_TOO_SHORT',
  'NICKNAME_TOO_LONG',
  'NICKNAME_INVALID_CHARS',
  'COLOR_INVALID',
  'ROOM_NAME_TOO_SHORT',
  'ROOM_NAME_TOO_LONG',
  'ROOM_NAME_INVALID_CHARS',
  'MESSAGE_EMPTY',
  'MESSAGE_TOO_LONG',
  'INVALID_PAYLOAD',
] as const

export type ValidationCode = (typeof VALIDATION_CODES)[number]

const code = (value: ValidationCode) => ({ error: value })

export const loginSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(LIMITS.nicknameMin, code('NICKNAME_TOO_SHORT'))
    .max(LIMITS.nicknameMax, code('NICKNAME_TOO_LONG'))
    .regex(NICKNAME, code('NICKNAME_INVALID_CHARS')),
  color: z.string().regex(HEX_COLOR, code('COLOR_INVALID')).optional(),
})

export const roomIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/)

export const createRoomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(LIMITS.roomNameMin, code('ROOM_NAME_TOO_SHORT'))
    .max(LIMITS.roomNameMax, code('ROOM_NAME_TOO_LONG'))
    .regex(ROOM_NAME, code('ROOM_NAME_INVALID_CHARS')),
})

export const roomRefSchema = z.object({ roomId: roomIdSchema })

export const sendMessageSchema = z.object({
  roomId: roomIdSchema,
  text: z
    .string()
    .trim()
    .min(1, code('MESSAGE_EMPTY'))
    .max(LIMITS.messageMax, code('MESSAGE_TOO_LONG')),
  clientId: z.string().min(1).max(64).optional(),
})

/** First known validation code of a zod error (wrong types/shapes become INVALID_PAYLOAD). */
export function validationCodeOf(error: z.ZodError): ValidationCode {
  const message = error.issues[0]?.message
  return VALIDATION_CODES.includes(message as ValidationCode)
    ? (message as ValidationCode)
    : 'INVALID_PAYLOAD'
}

export type LoginInput = z.infer<typeof loginSchema>
export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type RoomRef = z.infer<typeof roomRefSchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>

/**
 * Turns a human room name into a stable, URL-friendly id:
 * "Café & Código" -> "cafe-codigo".
 */
export function slugifyRoomName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}
