import { describe, expect, it } from 'vitest'
import { ChatStore } from '../src/chat/chat-store.js'

const ana = { id: 'u-ana', nickname: 'Ana', color: '#6366f1' }
const bia = { id: 'u-bia', nickname: 'bia', color: '#22c55e' }

describe('ChatStore', () => {
  it('boots with the default rooms', () => {
    const store = new ChatStore()
    expect(store.listRooms().map((room) => room.id)).toEqual(['geral', 'dev', 'random'])
  })

  it('creates rooms with slugified ids and rejects duplicates', () => {
    const store = new ChatStore({ now: () => 42 })
    expect(store.createRoom(' Front-end Brasil ', ana.id)).toEqual({
      ok: true,
      room: { id: 'front-end-brasil', name: 'Front-end Brasil', createdAt: 42, createdBy: ana.id },
    })
    expect(store.createRoom('front end brasil', bia.id)).toEqual({ ok: false, reason: 'CONFLICT' })
  })

  it('enforces the room limit', () => {
    const store = new ChatStore({ maxRooms: 4 })
    expect(store.createRoom('extra', ana.id).ok).toBe(true)
    expect(store.createRoom('outra', ana.id)).toEqual({ ok: false, reason: 'LIMIT_REACHED' })
  })

  it('keeps only the most recent messages', () => {
    const store = new ChatStore({ historyLimit: 2 })
    for (const text of ['a', 'b', 'c']) store.addMessage({ roomId: 'geral', author: ana, text })
    expect(store.getHistory('geral').map((m) => m.text)).toEqual(['b', 'c'])
  })

  it('throws when adding a message to an unknown room', () => {
    const store = new ChatStore()
    expect(() => store.addMessage({ roomId: 'nope', author: ana, text: 'x' })).toThrow()
  })

  it('tracks presence per user across several sockets', () => {
    const store = new ChatStore()
    expect(store.joinRoom('geral', ana, 's1')).toBe(true)
    expect(store.joinRoom('geral', ana, 's2')).toBe(false)
    expect(store.joinRoom('geral', bia, 's3')).toBe(true)
    expect(store.getOnlineUsers('geral')).toEqual([ana, bia])
    expect(store.getRoom('geral')?.onlineCount).toBe(2)

    expect(store.leaveRoom('geral', ana.id, 's1')).toBe(false)
    expect(store.leaveAllRooms(ana.id, 's2')).toEqual(['geral'])
    expect(store.getOnlineUsers('geral')).toEqual([bia])
  })

  it('knows which nicknames are online', () => {
    const store = new ChatStore()
    store.connect(ana, 's1')
    expect(store.isNicknameOnline(' ANA ')).toBe(true)
    store.disconnect(ana.id, 's1')
    expect(store.isNicknameOnline('ana')).toBe(false)
  })
})
