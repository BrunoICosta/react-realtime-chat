import type {
  ClientToServerEvents,
  LoginResponse,
  ServerEventName,
  ServerEventPayload,
  ServerToClientEvents,
} from '@chat/shared'
import { io as connect, type Socket } from 'socket.io-client'
import { afterEach } from 'vitest'
import type { ServerConfig } from '../src/config.js'
import { createChatServer, type ChatServerOptions } from '../src/server.js'

export type TestClient = Socket<ServerToClientEvents, ClientToServerEvents>

export const testConfig: ServerConfig = {
  env: 'test',
  port: 0,
  corsOrigins: ['http://localhost'],
  jwtSecret: 'test-secret-with-enough-length',
  jwtExpiresInSeconds: 60,
}

const cleanups: Array<() => Promise<void> | void> = []

afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

/** Boots an isolated server on an ephemeral port; it is closed after each test. */
export async function startServer(options: ChatServerOptions = {}) {
  const server = createChatServer(testConfig, options)
  const port = await server.listen(0)
  const url = `http://localhost:${port}`
  cleanups.push(() => server.close())

  async function login(nickname: string, color?: string): Promise<LoginResponse> {
    const response = await fetch(`${url}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nickname, color }),
    })
    if (!response.ok) throw new Error(`login failed with ${response.status}`)
    return (await response.json()) as LoginResponse
  }

  /** Opens a socket without waiting, so listeners can be attached before the handshake. */
  function openClient(token: string | undefined): TestClient {
    const client: TestClient = connect(url, {
      auth: token === undefined ? {} : { token },
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    })
    cleanups.push(() => {
      client.disconnect()
    })
    return client
  }

  /** Opens a socket with the given token and waits for the handshake to finish. */
  function connectWithToken(token: string | undefined): Promise<TestClient> {
    const client = openClient(token)
    return new Promise((resolve, reject) => {
      client.once('connect', () => resolve(client))
      client.once('connect_error', reject)
    })
  }

  async function connectAs(nickname: string) {
    const session = await login(nickname)
    const client = await connectWithToken(session.token)
    return { client, user: session.user, token: session.token }
  }

  return { server, url, login, openClient, connectWithToken, connectAs }
}

/** Resolves with the next payload of `event`, or rejects after `timeoutMs`. */
export function nextEvent<E extends ServerEventName>(
  client: TestClient,
  event: E,
  predicate: (payload: ServerEventPayload<E>) => boolean = () => true,
  timeoutMs = 2_000,
): Promise<ServerEventPayload<E>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.off(event, listener as never)
      reject(new Error(`Timed out waiting for "${event}"`))
    }, timeoutMs)

    const listener = (payload: ServerEventPayload<E>) => {
      if (!predicate(payload)) return
      clearTimeout(timer)
      client.off(event, listener as never)
      resolve(payload)
    }
    client.on(event, listener as never)
  })
}

/** Fails if `event` fires within `windowMs`. */
export function expectNoEvent(client: TestClient, event: ServerEventName, windowMs = 200) {
  return new Promise<void>((resolve, reject) => {
    const listener = () => {
      clearTimeout(timer)
      reject(new Error(`Unexpected "${event}"`))
    }
    const timer = setTimeout(() => {
      client.off(event, listener)
      resolve()
    }, windowMs)
    client.on(event, listener)
  })
}

export function joinRoom(client: TestClient, roomId: string) {
  return client.emitWithAck('room:join', { roomId })
}
