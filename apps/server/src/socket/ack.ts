import type { Ack, AckError, AckResult, ErrorCode } from '@chat/shared'
import type { z } from 'zod'

/**
 * Socket.io types the ack as always present, but a misbehaving client can omit it.
 * Normalizing it here keeps every handler free of `typeof ack === 'function'` checks.
 */
export function safeAck<T>(ack: unknown): Ack<T> {
  return typeof ack === 'function' ? (ack as Ack<T>) : () => undefined
}

export function ok<T>(data: T): AckResult<T> {
  return { ok: true, data }
}

export function fail(
  code: ErrorCode,
  message: string,
  extra?: Partial<AckError>,
): AckResult<never> {
  return { ok: false, error: { code, message, ...extra } }
}

export type Parsed<T> = { ok: true; data: T } | { ok: false; result: AckResult<never> }

/** Validates an untrusted payload, returning a ready-to-send ack error on failure. */
export function parsePayload<S extends z.ZodType>(
  schema: S,
  payload: unknown,
): Parsed<z.output<S>> {
  const parsed = schema.safeParse(payload)
  if (parsed.success) return { ok: true, data: parsed.data }
  return {
    ok: false,
    result: fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos'),
  }
}
