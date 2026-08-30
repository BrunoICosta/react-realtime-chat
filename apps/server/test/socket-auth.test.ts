import { UNAUTHORIZED_ERROR } from '@chat/shared'
import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'
import { nextEvent, startServer, testConfig } from './helpers.js'

describe('socket handshake auth', () => {
  it('rejects connections without a token', async () => {
    const { connectWithToken } = await startServer()
    await expect(connectWithToken(undefined)).rejects.toThrow(UNAUTHORIZED_ERROR)
  })

  it('rejects tokens signed with another secret', async () => {
    const { connectWithToken } = await startServer()
    const forged = jwt.sign({ nickname: 'Eve', color: '#000000' }, 'some-other-secret', {
      subject: 'eve',
    })
    await expect(connectWithToken(forged)).rejects.toThrow(UNAUTHORIZED_ERROR)
  })

  it('rejects expired tokens', async () => {
    const { connectWithToken } = await startServer()
    const expired = jwt.sign(
      { nickname: 'Old', color: '#000000', exp: Math.floor(Date.now() / 1000) - 10 },
      testConfig.jwtSecret,
      { subject: 'old' },
    )
    await expect(connectWithToken(expired)).rejects.toThrow(UNAUTHORIZED_ERROR)
  })

  it('accepts a valid token and pushes the room list', async () => {
    const { login, openClient } = await startServer()
    const session = await login('Fabi')
    const client = openClient(session.token)

    const rooms = await nextEvent(client, 'rooms:update')
    expect(client.connected).toBe(true)
    expect(rooms.map((room) => room.id)).toEqual(['geral', 'dev', 'random'])
    expect(rooms.every((room) => room.onlineCount === 0)).toBe(true)
  })
})
