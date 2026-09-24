import {
  TYPING_TIMEOUT_MS,
  createRoomSchema,
  loginSchema,
  roomIdSchema,
  sendMessageSchema,
  slugifyRoomName,
  validationCodeOf,
  type ChatMessage,
  type JoinRoomResult,
  type LoginInput,
  type PublicUser,
  type Room,
  type RoomSummary,
  type SendMessageInput,
} from '@chat/shared'
import type { z } from 'zod'
import { DEFAULT_LANGUAGE, type Language } from '../../i18n/languages'
import { Emitter } from '../../lib/emitter'
import {
  TransportError,
  type ChatTransport,
  type Session,
  type TransportEvents,
} from '../chat-transport'
import { botReply } from './demo-bot'
import { DemoStorage, type KeyValueStorage } from './demo-storage'
import { AMBIENT_LINES, localizeSeed } from './demo-content'
import { BOT_USER, isReservedNickname, simulatedUsersIn } from './demo-users'

/** The subset of `BroadcastChannel` the transport needs (easy to fake in tests). */
export interface ChannelLike {
  postMessage(message: unknown): void
  close(): void
  onmessage: ((event: MessageEvent) => void) | null
}

interface PeerInfo {
  peerId: string
  user: PublicUser
  rooms: string[]
}

type DemoPacket =
  | { type: 'hello'; peer: PeerInfo }
  | { type: 'state'; peer: PeerInfo }
  | { type: 'bye'; peerId: string }
  | { type: 'message'; message: ChatMessage }
  | { type: 'typing'; roomId: string; user: PublicUser; typing: boolean }
  | { type: 'rooms' }

export interface DemoTransportOptions {
  channelName?: string
  createChannel?: (name: string) => ChannelLike
  storage?: KeyValueStorage | null
  random?: () => number
  /** Artificial latency for requests, so the UI loading states are visible. */
  latencyMs?: number
  heartbeatMs?: number
  peerTtlMs?: number
  /** Simulated users post small talk every now and then. */
  ambientChatter?: boolean
  /** Language of this tab: the bot, seed messages and small talk follow it. */
  getLanguage?: () => Language
}

type Timer = ReturnType<typeof setTimeout>

const DEFAULTS = {
  channelName: 'react-realtime-chat-demo',
  latencyMs: 120,
  heartbeatMs: 3_000,
  peerTtlMs: 10_000,
}

/**
 * A fake server that runs inside the browser.
 *
 * Every tab is a "peer". Peers announce themselves (and the rooms they joined) over a
 * `BroadcastChannel`, relay messages and typing state to each other, and persist rooms
 * and history in localStorage. On top of that a bot answers in #geral and a couple of
 * simulated users keep the rooms alive. It implements the same `ChatTransport`
 * contract as the Socket.io transport, so the UI cannot tell them apart.
 */
export class BroadcastChannelTransport implements ChatTransport {
  readonly mode = 'demo' as const

  private readonly events = new Emitter<TransportEvents>()
  private readonly store: DemoStorage
  private readonly options: Required<Omit<DemoTransportOptions, 'storage'>>
  private readonly peerId = crypto.randomUUID()

  private channel: ChannelLike | null = null
  private session: Session | null = null
  private readonly joined = new Set<string>()
  private readonly peers = new Map<string, PeerInfo & { seenAt: number }>()
  /** roomId -> userId -> typing entry (remote tabs and simulated users). */
  private readonly typing = new Map<string, Map<string, { user: PublicUser; timer: Timer }>>()
  private readonly timers = new Set<Timer>()
  private heartbeat: ReturnType<typeof setInterval> | null = null
  private lastAmbientText: string | null = null

  constructor(options: DemoTransportOptions = {}) {
    this.options = {
      channelName: options.channelName ?? DEFAULTS.channelName,
      createChannel:
        options.createChannel ?? ((name) => new BroadcastChannel(name) as unknown as ChannelLike),
      random: options.random ?? Math.random,
      latencyMs: options.latencyMs ?? DEFAULTS.latencyMs,
      heartbeatMs: options.heartbeatMs ?? DEFAULTS.heartbeatMs,
      peerTtlMs: options.peerTtlMs ?? DEFAULTS.peerTtlMs,
      ambientChatter: options.ambientChatter ?? true,
      getLanguage: options.getLanguage ?? (() => DEFAULT_LANGUAGE),
    }
    const storage =
      options.storage === undefined
        ? typeof localStorage === 'undefined'
          ? null
          : localStorage
        : options.storage
    this.store = new DemoStorage(storage)
  }

  // Lifecycle --------------------------------------------------------------

  async login(input: LoginInput): Promise<Session> {
    await this.delay()
    const { nickname, color } = validate(loginSchema, input)
    if (isReservedNickname(nickname)) {
      throw new TransportError('CONFLICT')
    }
    const user: PublicUser = { id: crypto.randomUUID(), nickname, color: color ?? '#6366f1' }
    return { token: `demo.${user.id}`, user }
  }

  connect(session: Session) {
    this.disconnect()
    this.session = session
    this.events.emit('status', 'connecting')

    const channel = this.options.createChannel(this.options.channelName)
    channel.onmessage = (event) => this.handlePacket(event.data as DemoPacket)
    this.channel = channel

    this.later(() => {
      this.events.emit('status', 'connected')
      this.post({ type: 'hello', peer: this.selfInfo() })
      this.events.emit('rooms:update', this.roomSummaries())
    }, this.options.latencyMs)

    this.heartbeat = setInterval(() => {
      this.post({ type: 'state', peer: this.selfInfo() })
      this.prunePeers()
    }, this.options.heartbeatMs)

    if (this.options.ambientChatter) this.scheduleAmbient()
    if (typeof window !== 'undefined') window.addEventListener('pagehide', this.handlePageHide)
  }

  disconnect() {
    if (!this.channel) return
    this.post({ type: 'bye', peerId: this.peerId })
    this.channel.onmessage = null
    this.channel.close()
    this.channel = null

    if (this.heartbeat) clearInterval(this.heartbeat)
    this.heartbeat = null
    for (const timer of this.timers) clearTimeout(timer)
    this.timers.clear()
    for (const room of this.typing.values()) {
      for (const entry of room.values()) clearTimeout(entry.timer)
    }
    this.typing.clear()
    this.peers.clear()
    this.joined.clear()
    this.session = null
    if (typeof window !== 'undefined') window.removeEventListener('pagehide', this.handlePageHide)

    this.events.emit('status', 'offline')
  }

  on<E extends keyof TransportEvents>(event: E, listener: TransportEvents[E]) {
    return this.events.on(event, listener)
  }

  // Requests ---------------------------------------------------------------

  async createRoom(name: string): Promise<Room> {
    await this.delay()
    const self = this.requireSession()
    const input = validate(createRoomSchema, { name })
    const id = slugifyRoomName(input.name)
    if (!id) throw new TransportError('VALIDATION', 'ROOM_NAME_INVALID_CHARS')
    if (this.store.getRoom(id)) throw new TransportError('CONFLICT')

    const room: Room = { id, name: input.name, createdAt: Date.now(), createdBy: self.id }
    this.store.addRoom(room)
    this.post({ type: 'rooms' })
    this.events.emit('rooms:update', this.roomSummaries())
    return room
  }

  async joinRoom(roomId: string): Promise<JoinRoomResult> {
    await this.delay()
    this.requireSession()
    const id = validate(roomIdSchema, roomId)
    const room = this.store.getRoom(id)
    if (!room) throw new TransportError('NOT_FOUND')

    const isNew = !this.joined.has(id)
    this.joined.add(id)
    if (isNew) {
      this.post({ type: 'state', peer: this.selfInfo() })
      this.events.emit('rooms:update', this.roomSummaries())
    }

    const typingNow = this.typingIn(id)
    if (typingNow.length > 0) {
      this.later(() => this.events.emit('typing:update', { roomId: id, users: typingNow }), 0)
    }

    return {
      room: this.summaryOf(room),
      history: this.store
        .getHistory(id)
        .map((message) => localizeSeed(message, this.options.getLanguage())),
      users: this.usersIn(id),
    }
  }

  leaveRoom(roomId: string) {
    if (!this.session || !this.joined.delete(roomId)) return
    this.post({ type: 'typing', roomId, user: this.session.user, typing: false })
    this.post({ type: 'state', peer: this.selfInfo() })
    this.events.emit('rooms:update', this.roomSummaries())
  }

  async sendMessage(input: SendMessageInput): Promise<ChatMessage> {
    await this.delay()
    const author = this.requireSession()
    const { roomId, text, clientId } = validate(sendMessageSchema, input)
    if (!this.joined.has(roomId)) {
      throw new TransportError('NOT_IN_ROOM')
    }

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      roomId,
      author,
      text,
      sentAt: Date.now(),
      ...(clientId ? { clientId } : {}),
    }
    this.store.appendMessage(message)
    this.post({ type: 'message', message })
    this.post({ type: 'typing', roomId, user: author, typing: false })

    if (roomId === 'geral') this.scheduleBotReply(message)
    return message
  }

  startTyping(roomId: string) {
    if (this.session && this.joined.has(roomId)) {
      this.post({ type: 'typing', roomId, user: this.session.user, typing: true })
    }
  }

  stopTyping(roomId: string) {
    if (this.session) this.post({ type: 'typing', roomId, user: this.session.user, typing: false })
  }

  // Incoming packets -------------------------------------------------------

  private handlePacket(packet: DemoPacket) {
    switch (packet.type) {
      case 'hello':
        this.upsertPeer(packet.peer)
        // Answer so the newcomer learns about us right away instead of on the next heartbeat.
        this.post({ type: 'state', peer: this.selfInfo() })
        break
      case 'state':
        this.upsertPeer(packet.peer)
        break
      case 'bye':
        this.removePeer(packet.peerId)
        break
      case 'message':
        this.clearTyping(packet.message.roomId, packet.message.author.id)
        if (this.joined.has(packet.message.roomId)) {
          this.events.emit('message:new', packet.message)
        }
        break
      case 'typing':
        if (packet.typing) this.setTyping(packet.roomId, packet.user)
        else this.clearTyping(packet.roomId, packet.user.id)
        break
      case 'rooms':
        this.events.emit('rooms:update', this.roomSummaries())
        break
    }
  }

  private upsertPeer(peer: PeerInfo) {
    const previous = this.peers.get(peer.peerId)
    this.peers.set(peer.peerId, { ...peer, seenAt: Date.now() })

    const before = new Set(previous?.rooms ?? [])
    const after = new Set(peer.rooms)
    const changed = [...new Set([...before, ...after])].filter(
      (roomId) => before.has(roomId) !== after.has(roomId),
    )
    if (changed.length > 0) this.presenceChanged(changed)
  }

  private removePeer(peerId: string) {
    const peer = this.peers.get(peerId)
    if (!peer) return
    this.peers.delete(peerId)
    for (const roomId of peer.rooms) this.clearTyping(roomId, peer.user.id)
    this.presenceChanged(peer.rooms)
  }

  private prunePeers() {
    const deadline = Date.now() - this.options.peerTtlMs
    for (const [peerId, peer] of this.peers) {
      if (peer.seenAt < deadline) this.removePeer(peerId)
    }
  }

  private presenceChanged(roomIds: string[]) {
    for (const roomId of roomIds) {
      if (this.joined.has(roomId)) {
        this.events.emit('presence:update', { roomId, users: this.usersIn(roomId) })
      }
    }
    this.events.emit('rooms:update', this.roomSummaries())
  }

  // Typing -----------------------------------------------------------------

  private setTyping(roomId: string, user: PublicUser, ttlMs = TYPING_TIMEOUT_MS) {
    let room = this.typing.get(roomId)
    if (!room) {
      room = new Map()
      this.typing.set(roomId, room)
    }
    const existing = room.get(user.id)
    if (existing) clearTimeout(existing.timer)
    const timer = setTimeout(() => this.clearTyping(roomId, user.id), ttlMs)
    room.set(user.id, { user, timer })
    if (!existing) this.emitTyping(roomId)
  }

  private clearTyping(roomId: string, userId: string) {
    const room = this.typing.get(roomId)
    const entry = room?.get(userId)
    if (!room || !entry) return
    clearTimeout(entry.timer)
    room.delete(userId)
    this.emitTyping(roomId)
  }

  private typingIn(roomId: string): PublicUser[] {
    return [...(this.typing.get(roomId)?.values() ?? [])].map((entry) => entry.user)
  }

  private emitTyping(roomId: string) {
    if (this.joined.has(roomId)) {
      this.events.emit('typing:update', { roomId, users: this.typingIn(roomId) })
    }
  }

  // Simulated users ----------------------------------------------------------

  private scheduleBotReply(trigger: ChatMessage) {
    const text = botReply(trigger.text, trigger.author, {
      now: new Date(),
      random: this.options.random,
      language: this.options.getLanguage(),
    })
    const typingMs = 700 + Math.round(this.options.random() * 900)
    this.later(() => {
      this.simulateMessage('geral', BOT_USER, text, typingMs)
    }, 400)
  }

  /** Shows `user` typing for `typingMs` in every tab, then posts the message everywhere. */
  private simulateMessage(roomId: string, user: PublicUser, text: string, typingMs: number) {
    this.setTyping(roomId, user, typingMs + 1_000)
    this.post({ type: 'typing', roomId, user, typing: true })

    this.later(() => {
      const message: ChatMessage = {
        id: crypto.randomUUID(),
        roomId,
        author: user,
        text,
        sentAt: Date.now(),
      }
      this.store.appendMessage(message)
      this.post({ type: 'message', message })
      this.handlePacket({ type: 'message', message })
    }, typingMs)
  }

  private scheduleAmbient() {
    const wait = 45_000 + Math.round(this.options.random() * 45_000)
    this.later(() => {
      this.ambientTick()
      this.scheduleAmbient()
    }, wait)
  }

  private ambientTick() {
    // Only one tab (the one with the smallest id) drives the simulation.
    const ids = [this.peerId, ...this.peers.keys()].sort()
    if (ids[0] !== this.peerId) return

    const occupied = [...this.joined, ...[...this.peers.values()].flatMap((peer) => peer.rooms)]
    const candidates = Object.entries(AMBIENT_LINES[this.options.getLanguage()])
      .filter(([roomId]) => occupied.includes(roomId))
      .flatMap(([roomId, lines]) => lines.map((line) => ({ roomId, ...line })))
      .filter((line) => line.text !== this.lastAmbientText)
    if (candidates.length === 0) return

    const line = candidates[Math.floor(this.options.random() * candidates.length)]
    if (!line) return
    this.lastAmbientText = line.text
    this.simulateMessage(line.roomId, line.user, line.text, 1_500 + this.options.random() * 1_500)
  }

  // Helpers ----------------------------------------------------------------

  private selfInfo(): PeerInfo {
    return { peerId: this.peerId, user: this.requireSession(), rooms: [...this.joined] }
  }

  private usersIn(roomId: string): PublicUser[] {
    const users = new Map<string, PublicUser>()
    if (this.session && this.joined.has(roomId)) users.set(this.session.user.id, this.session.user)
    for (const peer of this.peers.values()) {
      if (peer.rooms.includes(roomId)) users.set(peer.user.id, peer.user)
    }
    for (const user of simulatedUsersIn(roomId)) users.set(user.id, user)
    return [...users.values()].sort((a, b) => a.nickname.localeCompare(b.nickname, 'pt-BR'))
  }

  private summaryOf(room: Room): RoomSummary {
    return { ...room, onlineCount: this.usersIn(room.id).length }
  }

  private roomSummaries(): RoomSummary[] {
    return this.store.listRooms().map((room) => this.summaryOf(room))
  }

  private requireSession(): PublicUser {
    if (!this.session) throw new TransportError('OFFLINE')
    return this.session.user
  }

  private post(packet: DemoPacket) {
    this.channel?.postMessage(packet)
  }

  private later(fn: () => void, ms: number) {
    const timer = setTimeout(() => {
      this.timers.delete(timer)
      fn()
    }, ms)
    this.timers.add(timer)
  }

  private delay() {
    return new Promise<void>((resolve) => this.later(resolve, this.options.latencyMs))
  }

  private readonly handlePageHide = () => {
    this.post({ type: 'bye', peerId: this.peerId })
  }
}

function validate<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    throw new TransportError('VALIDATION', validationCodeOf(parsed.error))
  }
  return parsed.data
}
