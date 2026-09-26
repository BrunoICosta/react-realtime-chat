import type { ChatMessage, PresencePayload, TypingPayload } from '@chat/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Language } from '../../i18n/languages'
import type { Session } from '../chat-transport'
import { BroadcastChannelTransport, type ChannelLike } from './broadcast-channel-transport'
import type { KeyValueStorage } from './demo-storage'

/** In-memory BroadcastChannel: delivers to every other channel with the same name. */
function createChannelHub() {
  const channels = new Set<ChannelLike & { name: string }>()
  return (name: string): ChannelLike => {
    const channel: ChannelLike & { name: string } = {
      name,
      onmessage: null,
      postMessage(message) {
        for (const other of channels) {
          if (other !== channel && other.name === name) {
            const data = structuredClone(message)
            queueMicrotask(() => other.onmessage?.({ data } as MessageEvent))
          }
        }
      },
      close() {
        channels.delete(channel)
      },
    }
    channels.add(channel)
    return channel
  }
}

function createMemoryStorage(): KeyValueStorage {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  }
}

describe('BroadcastChannelTransport', () => {
  let createChannel: ReturnType<typeof createChannelHub>
  let storage: KeyValueStorage

  beforeEach(() => {
    vi.useFakeTimers()
    createChannel = createChannelHub()
    storage = createMemoryStorage()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function createTab(language: Language = 'pt-BR') {
    return new BroadcastChannelTransport({
      createChannel,
      storage,
      latencyMs: 0,
      ambientChatter: false,
      random: () => 0,
      getLanguage: () => language,
    })
  }

  async function connect(tab: BroadcastChannelTransport, nickname: string): Promise<Session> {
    const loginPromise = tab.login({ nickname })
    await vi.advanceTimersByTimeAsync(0)
    const session = await loginPromise
    tab.connect(session)
    await vi.advanceTimersByTimeAsync(1)
    return session
  }

  async function join(tab: BroadcastChannelTransport, roomId: string) {
    const promise = tab.joinRoom(roomId)
    await vi.advanceTimersByTimeAsync(0)
    return promise
  }

  async function send(tab: BroadcastChannelTransport, roomId: string, text: string) {
    const promise = tab.sendMessage({ roomId, text, clientId: 'c1' })
    await vi.advanceTimersByTimeAsync(0)
    return promise
  }

  it('connects and lists the default rooms with simulated presence', async () => {
    const tab = createTab()
    const statuses: string[] = []
    tab.on('status', (status) => statuses.push(status))
    const rooms = vi.fn()
    tab.on('rooms:update', rooms)

    await connect(tab, 'Ana')

    expect(statuses).toEqual(['connecting', 'connected'])
    const listed = rooms.mock.lastCall?.[0] as { id: string; onlineCount: number }[]
    expect(listed.map((room) => room.id)).toEqual(['geral', 'dev', 'random'])
    expect(listed.find((room) => room.id === 'geral')?.onlineCount).toBeGreaterThan(0)
  })

  it('returns seeded history and the simulated users on join', async () => {
    const tab = createTab()
    const session = await connect(tab, 'Ana')
    const result = await join(tab, 'geral')

    expect(result.history.length).toBeGreaterThan(0)
    expect(result.users.map((user) => user.nickname)).toEqual(
      expect.arrayContaining(['Ana', 'Lia (bot)']),
    )
    expect(result.users).toContainEqual(session.user)
  })

  it('validates input with the shared schemas', async () => {
    const tab = createTab()
    const loginPromise = tab.login({ nickname: 'a' })
    const assertion = expect(loginPromise).rejects.toMatchObject({ code: 'VALIDATION' })
    await vi.advanceTimersByTimeAsync(0)
    await assertion

    await connect(tab, 'Ana')
    const sendPromise = tab.sendMessage({ roomId: 'geral', text: 'oi' })
    const notJoined = expect(sendPromise).rejects.toMatchObject({ code: 'NOT_IN_ROOM' })
    await vi.advanceTimersByTimeAsync(0)
    await notJoined
  })

  it('delivers messages, presence and typing between tabs', async () => {
    const tabA = createTab()
    const tabB = createTab()
    const sessionA = await connect(tabA, 'Ana')
    await connect(tabB, 'Bia')
    await join(tabA, 'dev')

    const presence: PresencePayload[] = []
    tabA.on('presence:update', (payload) => presence.push(payload))
    await join(tabB, 'dev')
    await vi.advanceTimersByTimeAsync(1)
    expect(presence.at(-1)?.users.map((user) => user.nickname)).toContain('Bia')

    const typing: TypingPayload[] = []
    tabB.on('typing:update', (payload) => typing.push(payload))
    tabA.startTyping('dev')
    await vi.advanceTimersByTimeAsync(1)
    expect(typing.at(-1)?.users).toEqual([sessionA.user])

    const received: ChatMessage[] = []
    tabB.on('message:new', (message) => received.push(message))
    const sent = await send(tabA, 'dev', 'olá, aba vizinha!')
    await vi.advanceTimersByTimeAsync(1)

    expect(received).toEqual([sent])
    expect(typing.at(-1)?.users).toEqual([])
  })

  it('persists history so a tab opened later sees it', async () => {
    const tabA = createTab()
    await connect(tabA, 'Ana')
    await join(tabA, 'random')
    await send(tabA, 'random', 'deixando um recado')

    const later = createTab()
    await connect(later, 'Caio')
    const result = await join(later, 'random')
    expect(result.history.map((message) => message.text)).toContain('deixando um recado')
  })

  it('speaks the language of the tab: seed history and bot replies', async () => {
    const tab = createTab('en')
    await connect(tab, 'Ana')
    const result = await join(tab, 'geral')
    expect(result.history.map((message) => message.text)).toContain('Good morning, everyone! ☀️')

    const messages: ChatMessage[] = []
    tab.on('message:new', (message) => messages.push(message))
    await send(tab, 'geral', 'hello')
    await vi.advanceTimersByTimeAsync(2_500)
    expect(messages.at(-1)?.text).toBe('Hi, Ana! 👋 Great to see you here.')

    // The same stored seed is shown in Portuguese to a pt-BR tab.
    const other = createTab('pt-BR')
    await connect(other, 'Bia')
    const again = await join(other, 'geral')
    expect(again.history.map((message) => message.text)).toContain('Bom dia, pessoal! ☀️')
  })

  it('lets the bot answer in #geral after showing it typing', async () => {
    const tab = createTab()
    await connect(tab, 'Ana')
    await join(tab, 'geral')

    const typing: TypingPayload[] = []
    const messages: ChatMessage[] = []
    tab.on('typing:update', (payload) => typing.push(payload))
    tab.on('message:new', (message) => messages.push(message))

    await send(tab, 'geral', 'oi')
    await vi.advanceTimersByTimeAsync(500)
    expect(typing.at(-1)?.users.map((user) => user.nickname)).toEqual(['Lia (bot)'])

    await vi.advanceTimersByTimeAsync(2_000)
    expect(messages.at(-1)).toMatchObject({
      roomId: 'geral',
      author: { nickname: 'Lia (bot)' },
      text: 'Oi, Ana! 👋 Que bom te ver por aqui.',
    })
    expect(typing.at(-1)?.users).toEqual([])
  })

  it('creates rooms visible to other tabs and rejects duplicates', async () => {
    const tabA = createTab()
    const tabB = createTab()
    await connect(tabA, 'Ana')
    await connect(tabB, 'Bia')
    const roomsB = vi.fn()
    tabB.on('rooms:update', roomsB)

    const create = tabA.createRoom('Projetos Legais')
    await vi.advanceTimersByTimeAsync(1)
    expect(await create).toMatchObject({ id: 'projetos-legais', name: 'Projetos Legais' })
    const ids = (roomsB.mock.lastCall?.[0] as { id: string }[]).map((room) => room.id)
    expect(ids).toContain('projetos-legais')

    const duplicate = tabB.createRoom('projetos legais')
    const rejected = expect(duplicate).rejects.toMatchObject({ code: 'CONFLICT' })
    await vi.advanceTimersByTimeAsync(1)
    await rejected
  })

  it('forgets peers that stop sending heartbeats', async () => {
    const tabA = createTab()
    const tabB = createTab()
    await connect(tabA, 'Ana')
    await connect(tabB, 'Bia')
    await join(tabA, 'random')
    await join(tabB, 'random')
    await vi.advanceTimersByTimeAsync(1)

    const presence: PresencePayload[] = []
    tabA.on('presence:update', (payload) => presence.push(payload))
    // Simulate a crashed tab: it disappears without saying goodbye.
    ;(tabB as unknown as { channel: ChannelLike }).channel.onmessage = null
    ;(tabB as unknown as { channel: ChannelLike }).channel.postMessage = () => undefined

    await vi.advanceTimersByTimeAsync(15_000)
    expect(presence.at(-1)?.users.map((user) => user.nickname)).not.toContain('Bia')
  })
})
