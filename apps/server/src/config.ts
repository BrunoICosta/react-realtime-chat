import { z } from 'zod'

const DEV_SECRET = 'dev-only-secret-change-me'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(0).max(65_535).default(3001),
  /** Comma separated list of allowed origins for CORS and the Socket.io handshake. */
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
  JWT_SECRET: z.string().min(16).optional(),
  JWT_EXPIRES_IN_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 12),
})

export interface ServerConfig {
  env: 'development' | 'test' | 'production'
  port: number
  corsOrigins: string[]
  jwtSecret: string
  jwtExpiresInSeconds: number
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): ServerConfig {
  const env = envSchema.parse(source)

  if (env.NODE_ENV === 'production' && !env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production')
  }

  return {
    env: env.NODE_ENV,
    port: env.PORT,
    corsOrigins: env.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    jwtSecret: env.JWT_SECRET ?? DEV_SECRET,
    jwtExpiresInSeconds: env.JWT_EXPIRES_IN_SECONDS,
  }
}

const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

/**
 * Origin check shared by Express CORS and the Socket.io handshake. Outside production any
 * localhost port is accepted, so Vite picking another port does not break local development.
 */
export function createOriginCheck(config: ServerConfig) {
  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowed =
      origin === undefined ||
      config.corsOrigins.includes(origin) ||
      (config.env !== 'production' && LOCALHOST_ORIGIN.test(origin))
    callback(null, allowed)
  }
}
