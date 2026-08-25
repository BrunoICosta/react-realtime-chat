import { z } from 'zod'
import { LIMITS } from './constants.js'

const HEX_COLOR = /^#[0-9a-f]{6}$/i
const NICKNAME = /^[\p{L}\p{N} _.-]+$/u
const ROOM_NAME = /^[\p{L}\p{N} _-]+$/u

export const loginSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(LIMITS.nicknameMin, `O apelido precisa ter ao menos ${LIMITS.nicknameMin} caracteres`)
    .max(LIMITS.nicknameMax, `O apelido pode ter no máximo ${LIMITS.nicknameMax} caracteres`)
    .regex(NICKNAME, 'Use apenas letras, números, espaço, ponto, _ ou -'),
  color: z.string().regex(HEX_COLOR, 'Cor inválida').optional(),
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
    .min(LIMITS.roomNameMin, `O nome precisa ter ao menos ${LIMITS.roomNameMin} caracteres`)
    .max(LIMITS.roomNameMax, `O nome pode ter no máximo ${LIMITS.roomNameMax} caracteres`)
    .regex(ROOM_NAME, 'Use apenas letras, números, espaço, _ ou -'),
})

export const roomRefSchema = z.object({ roomId: roomIdSchema })

export const sendMessageSchema = z.object({
  roomId: roomIdSchema,
  text: z
    .string()
    .trim()
    .min(1, 'A mensagem está vazia')
    .max(LIMITS.messageMax, `A mensagem pode ter no máximo ${LIMITS.messageMax} caracteres`),
  clientId: z.string().min(1).max(64).optional(),
})

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
