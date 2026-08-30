import { describe, expect, it } from 'vitest'
import { DEFAULT_RATE_LIMITS, TokenBucket } from '../src/chat/rate-limiter.js'
import { joinRoom, startServer } from './helpers.js'

describe('TokenBucket', () => {
  it('allows a burst, then refills over time', () => {
    let now = 0
    const bucket = new TokenBucket({ capacity: 2, refillPerSecond: 1, now: () => now })

    expect(bucket.take()).toEqual({ allowed: true })
    expect(bucket.take()).toEqual({ allowed: true })
    expect(bucket.take()).toEqual({ allowed: false, retryAfterMs: 1000 })

    now = 500
    expect(bucket.take()).toEqual({ allowed: false, retryAfterMs: 500 })

    now = 1000
    expect(bucket.take()).toEqual({ allowed: true })
  })

  it('never stores more than its capacity', () => {
    let now = 0
    const bucket = new TokenBucket({ capacity: 1, refillPerSecond: 10, now: () => now })
    now = 60_000
    expect(bucket.take().allowed).toBe(true)
    expect(bucket.take().allowed).toBe(false)
  })
})

describe('socket rate limiting', () => {
  it('answers RATE_LIMITED once the message budget is spent', async () => {
    const { connectAs } = await startServer({
      rateLimits: { ...DEFAULT_RATE_LIMITS, message: { capacity: 3, refillPerSecond: 0.1 } },
    })
    const { client } = await connectAs('Spammer')
    await joinRoom(client, 'geral')

    const results = []
    for (let i = 0; i < 4; i++) {
      results.push(await client.emitWithAck('message:send', { roomId: 'geral', text: `#${i}` }))
    }

    expect(results.slice(0, 3).every((result) => result.ok)).toBe(true)
    expect(results[3]).toMatchObject({ ok: false, error: { code: 'RATE_LIMITED' } })
    const last = results[3]
    expect(last && !last.ok && last.error.retryAfterMs).toBeGreaterThan(0)
  })

  it('keeps budgets independent per socket', async () => {
    const { connectAs } = await startServer({
      rateLimits: { ...DEFAULT_RATE_LIMITS, message: { capacity: 1, refillPerSecond: 0.1 } },
    })
    const ana = await connectAs('Ana')
    const bia = await connectAs('Bia')
    await joinRoom(ana.client, 'geral')
    await joinRoom(bia.client, 'geral')

    expect((await ana.client.emitWithAck('message:send', { roomId: 'geral', text: '1' })).ok).toBe(
      true,
    )
    expect((await ana.client.emitWithAck('message:send', { roomId: 'geral', text: '2' })).ok).toBe(
      false,
    )
    expect((await bia.client.emitWithAck('message:send', { roomId: 'geral', text: '1' })).ok).toBe(
      true,
    )
  })
})
