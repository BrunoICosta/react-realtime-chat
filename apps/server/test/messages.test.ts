import { LIMITS } from '@chat/shared'
import { describe, expect, it } from 'vitest'
import { ChatStore } from '../src/chat/chat-store.js'
import { expectNoEvent, joinRoom, nextEvent, startServer } from './helpers.js'

describe('messages', () => {
  it('acks the sender and broadcasts to the other members only', async () => {
    const { connectAs } = await startServer()
    const ana = await connectAs('Ana')
    const bruno = await connectAs('Bruno')
    const outsider = await connectAs('Fora')
    await joinRoom(ana.client, 'geral')
    await joinRoom(bruno.client, 'geral')
    await joinRoom(outsider.client, 'dev')

    const received = nextEvent(bruno.client, 'message:new')
    const senderEcho = expectNoEvent(ana.client, 'message:new')
    const outsiderSilence = expectNoEvent(outsider.client, 'message:new')

    const ack = await ana.client.emitWithAck('message:send', {
      roomId: 'geral',
      text: '  Olá, pessoal! 👋  ',
      clientId: 'tmp-1',
    })

    expect(ack).toMatchObject({
      ok: true,
      data: { roomId: 'geral', text: 'Olá, pessoal! 👋', clientId: 'tmp-1', author: ana.user },
    })
    const message = await received
    expect(ack.ok && message.id).toBe(ack.ok && ack.data.id)
    await Promise.all([senderEcho, outsiderSilence])
  })

  it('delivers the history when joining later', async () => {
    const { connectAs } = await startServer()
    const ana = await connectAs('Ana')
    await joinRoom(ana.client, 'dev')
    await ana.client.emitWithAck('message:send', { roomId: 'dev', text: 'primeira' })
    await ana.client.emitWithAck('message:send', { roomId: 'dev', text: 'segunda' })

    const late = await connectAs('Atrasado')
    const result = await joinRoom(late.client, 'dev')
    expect(result.ok && result.data.history.map((m) => m.text)).toEqual(['primeira', 'segunda'])
  })

  it('refuses messages to rooms the socket has not joined', async () => {
    const { connectAs } = await startServer()
    const { client } = await connectAs('Ana')
    const ack = await client.emitWithAck('message:send', { roomId: 'geral', text: 'oi' })
    expect(ack).toMatchObject({ ok: false, error: { code: 'NOT_IN_ROOM' } })
  })

  it.each([
    ['empty', '   ', 'MESSAGE_EMPTY'],
    ['too long', 'a'.repeat(LIMITS.messageMax + 1), 'MESSAGE_TOO_LONG'],
  ])('validates %s messages', async (_label, text, detail) => {
    const { connectAs } = await startServer()
    const { client } = await connectAs('Ana')
    await joinRoom(client, 'geral')
    const ack = await client.emitWithAck('message:send', { roomId: 'geral', text })
    expect(ack).toEqual({ ok: false, error: { code: 'VALIDATION', detail } })
  })

  it('ignores payloads of the wrong shape without crashing', async () => {
    const { connectAs } = await startServer()
    const { client } = await connectAs('Ana')
    await joinRoom(client, 'geral')

    const ack = await client.emitWithAck('message:send', 42 as never)
    expect(ack).toEqual({ ok: false, error: { code: 'VALIDATION', detail: 'INVALID_PAYLOAD' } })

    // Missing ack callback: the server must simply ignore it.
    ;(client.emit as (event: string, payload: unknown) => void)('message:send', {
      roomId: 'geral',
      text: 'sem ack',
    })
    const stillAlive = await client.emitWithAck('message:send', { roomId: 'geral', text: 'ok' })
    expect(stillAlive.ok).toBe(true)
  })

  it('caps the history kept per room', async () => {
    const { connectAs } = await startServer({ store: new ChatStore({ historyLimit: 3 }) })
    const { client } = await connectAs('Ana')
    await joinRoom(client, 'geral')
    for (const text of ['1', '2', '3', '4', '5']) {
      await client.emitWithAck('message:send', { roomId: 'geral', text })
    }

    const result = await joinRoom(client, 'geral')
    expect(result.ok && result.data.history.map((m) => m.text)).toEqual(['3', '4', '5'])
  })
})
