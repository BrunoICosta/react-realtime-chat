import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import type { ServerConfig } from './config.js'

export function createApp(config: ServerConfig) {
  const app = express()

  app.disable('x-powered-by')
  app.use(cors({ origin: config.corsOrigins }))
  app.use(express.json({ limit: '10kb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()) })
  })

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada' } })
  })

  const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
    const status =
      typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
        ? err.status
        : 500
    if (status >= 500) console.error(err)
    res.status(status).json({
      error: { code: status >= 500 ? 'INTERNAL' : 'BAD_REQUEST', message: 'Requisição inválida' },
    })
  }
  app.use(errorHandler)

  return app
}
