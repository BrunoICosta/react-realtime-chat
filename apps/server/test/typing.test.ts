import { describe, expect, it } from 'vitest'
import { joinRoom, nextEvent, startServer } from './helpers.js'

async function twoUsersInGeral(typingTimeoutMs?: number) {
  const { connectAs } = await startServer(typingTimeoutMs ? { typingTimeoutMs } : {})
  const ana = await connectAs('Ana')
  const bruno = await connectAs('Bruno')
  await joinRoom(ana.client, 'geral')
  await joinRoom(bruno.client, 'geral')
  return { ana, bruno }
}

describe('typing indicator', () => {
  it('tells the room who started and stopped typing', async () => {
    const { ana, bruno } = await twoUsersInGeral()

    const started = nextEvent(bruno.client, 'typing:update', (p) => p.users.length === 1)
    ana.client.emit('typing:start', { roomId: 'geral' })
    expect((await started).users).toEqual([ana.user])

    const stopped = nextEvent(bruno.client, 'typing:update', (p) => p.users.length === 0)
    ana.client.emit('typing:stop', { roomId: 'geral' })
    expect(await stopped).toEqual({ roomId: 'geral', users: [] })
  })

  it('expires typing state when the client goes quiet', async () => {
    const { ana, bruno } = await twoUsersInGeral(150)

    await new Promise<void>((resolve) => {
      bruno.client.once('typing:update', () => resolve())
      ana.client.emit('typing:start', { roomId: 'geral' })
    })
    const expired = await nextEvent(bruno.client, 'typing:update')
    expect(expired.users).toEqual([])
  })

  it('clears typing as soon as the message is sent', async () => {
    const { ana, bruno } = await twoUsersInGeral()

    const started = nextEvent(bruno.client, 'typing:update', (p) => p.users.length === 1)
    ana.client.emit('typing:start', { roomId: 'geral' })
    await started

    const cleared = nextEvent(bruno.client, 'typing:update', (p) => p.users.length === 0)
    await ana.client.emitWithAck('message:send', { roomId: 'geral', text: 'pronto' })
    await cleared
  })

  it('clears typing when the user disconnects', async () => {
    const { ana, bruno } = await twoUsersInGeral()

    const started = nextEvent(bruno.client, 'typing:update', (p) => p.users.length === 1)
    ana.client.emit('typing:start', { roomId: 'geral' })
    await started

    const cleared = nextEvent(bruno.client, 'typing:update', (p) => p.users.length === 0)
    ana.client.disconnect()
    await cleared
  })

  it('sends the current typing state to someone joining mid-typing', async () => {
    const { connectAs } = await startServer()
    const ana = await connectAs('Ana')
    const observer = await connectAs('Obs')
    await joinRoom(ana.client, 'geral')
    await joinRoom(observer.client, 'geral')

    const seen = nextEvent(observer.client, 'typing:update', (p) => p.users.length === 1)
    ana.client.emit('typing:start', { roomId: 'geral' })
    await seen

    const late = await connectAs('Late')
    const pending = nextEvent(late.client, 'typing:update')
    await joinRoom(late.client, 'geral')
    expect((await pending).users).toEqual([ana.user])
  })
})
