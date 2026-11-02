import { currentLanguage } from '../i18n/i18n'
import type { ChatTransport } from './chat-transport'
import { BroadcastChannelTransport } from './demo/broadcast-channel-transport'
import { SocketIoTransport } from './socket-io-transport'

/**
 * Picks the transport at startup:
 * - `VITE_SERVER_URL` set (local dev, self-hosted) -> real Socket.io server;
 * - otherwise (the static demo build) or `?demo` in the URL -> in-browser demo mode.
 */
export function createTransport(
  serverUrl: string | undefined = import.meta.env.VITE_SERVER_URL,
  search: string = typeof location === 'undefined' ? '' : location.search,
): ChatTransport {
  const forceDemo = new URLSearchParams(search).has('demo')
  const url = serverUrl?.trim()
  return url && !forceDemo
    ? new SocketIoTransport(url)
    : new BroadcastChannelTransport({ getLanguage: currentLanguage })
}
