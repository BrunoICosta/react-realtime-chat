import { describe, expect, it } from 'vitest'
import { expectNoEvent, joinRoom, nextEvent, startServer } from './helpers.js'

describe('rooms and presence', () => {
  it('joins a room and receives room info, history and online users', async () => {
    const { connectAs } = await startServer()
    const { client, user } = await connectAs('Gabi')

    const result = await joinRoom(client, 'geral')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.room).toMatchObject({ id: 'geral', name: 'geral', onlineCount: 1 })
    expect(result.data.history).toEqual([])
    expect(result.data.users).toEqual([user])
  })

  it('answers NOT_FOUND for unknown rooms and VALIDATION for bad ids', async () => {
    const { connectAs } = await startServer()
    const { client } = await connectAs('Hugo')

    expect(await joinRoom(client, 'nao-existe')).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    })
    expect(await joinRoom(client, 'Bad Id!')).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION' },
    })
  })

  it('broadcasts presence when someone joins and leaves', async () => {
    const { connectAs } = await startServer()
    const ana = await connectAs('Ana')
    const bruno = await connectAs('Bruno')
    await joinRoom(ana.client, 'geral')

    const joined = nextEvent(ana.client, 'presence:update', (p) => p.users.length === 2)
    await joinRoom(bruno.client, 'geral')
    expect((await joined).users.map((u) => u.nickname)).toEqual(['Ana', 'Bruno'])

    const left = nextEvent(ana.client, 'presence:update', (p) => p.users.length === 1)
    bruno.client.emit('room:leave', { roomId: 'geral' })
    expect((await left).users).toEqual([ana.user])
  })

  it('removes a user from every room on disconnect', async () => {
    const { connectAs } = await startServer()
    const ana = await connectAs('Ana')
    const caio = await connectAs('Caio')
    await joinRoom(ana.client, 'dev')
    await joinRoom(caio.client, 'dev')

    const update = nextEvent(ana.client, 'presence:update', (p) => p.users.length === 1)
    caio.client.disconnect()
    expect((await update).users).toEqual([ana.user])
  })

  it('keeps a user online while another tab of theirs is still in the room', async () => {
    const { login, connectWithToken, connectAs } = await startServer()
    const watcher = await connectAs('Watcher')
    const session = await login('Duda')
    const tab1 = await connectWithToken(session.token)
    const tab2 = await connectWithToken(session.token)
    await joinRoom(watcher.client, 'geral')
    await joinRoom(tab1, 'geral')
    await joinRoom(tab2, 'geral')

    const noChange = expectNoEvent(watcher.client, 'presence:update')
    tab1.disconnect()
    await noChange

    const result = await joinRoom(watcher.client, 'geral')
    expect(result.ok && result.data.users.map((u) => u.nickname)).toEqual(['Duda', 'Watcher'])
  })

  it('creates a room and announces it to everyone', async () => {
    const { connectAs } = await startServer()
    const ana = await connectAs('Ana')
    const bia = await connectAs('Bia')

    const announced = nextEvent(bia.client, 'rooms:update', (rooms) =>
      rooms.some((room) => room.id === 'cafe-com-codigo'),
    )
    const result = await ana.client.emitWithAck('room:create', { name: 'Café com Código' })

    expect(result).toMatchObject({
      ok: true,
      data: { id: 'cafe-com-codigo', name: 'Café com Código', createdBy: ana.user.id },
    })
    expect((await announced).length).toBe(4)
  })

  it('refuses duplicated and invalid room names', async () => {
    const { connectAs } = await startServer()
    const { client } = await connectAs('Ana')

    expect(await client.emitWithAck('room:create', { name: 'Geral' })).toMatchObject({
      ok: false,
      error: { code: 'CONFLICT' },
    })
    expect(await client.emitWithAck('room:create', { name: 'x' })).toEqual({
      ok: false,
      error: { code: 'VALIDATION', detail: 'ROOM_NAME_TOO_SHORT' },
    })
  })
})
