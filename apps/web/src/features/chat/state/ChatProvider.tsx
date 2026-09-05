import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  TransportError,
  errorMessage,
  type ChatTransport,
  type Session,
} from '../../../core/transport/chat-transport'
import {
  ChatActionsContext,
  ChatStateContext,
  type ChatActions,
  type ChatContextState,
  type ChatNotice,
} from './chat-context'
import { chatReducer, createInitialState, type ChatState } from './chat-reducer'

const LAST_ROOM_KEY = 'rrc:last-room'
const DEFAULT_ROOM = 'geral'

interface ChatProviderProps {
  transport: ChatTransport
  session: Session
  onLogout: () => void
  children: ReactNode
}

/**
 * Connects the transport to a reducer and exposes state + actions through two contexts,
 * so components that only trigger actions do not re-render on every new message.
 */
export function ChatProvider({ transport, session, onLogout, children }: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, session.user, createInitialState)
  const [notice, setNotice] = useState<ChatNotice | null>(null)
  const stateRef = useRef<ChatState>(state)
  const onLogoutRef = useRef(onLogout)

  useEffect(() => {
    stateRef.current = state
    onLogoutRef.current = onLogout
  })

  const notify = useCallback((text: string) => {
    setNotice({ id: Date.now(), text })
  }, [])

  const join = useCallback(
    (roomId: string) => {
      const run = async (id: string): Promise<void> => {
        dispatch({ type: 'joinStarted', roomId: id })
        try {
          dispatch({ type: 'joined', result: await transport.joinRoom(id) })
        } catch (error) {
          dispatch({ type: 'joinFailed', roomId: id, error: errorMessage(error) })
          // The remembered room no longer exists (server restarted): fall back to #geral.
          const gone = error instanceof TransportError && error.code === 'NOT_FOUND'
          if (gone && id !== DEFAULT_ROOM && stateRef.current.activeRoomId === id) {
            dispatch({ type: 'left', roomId: id })
            dispatch({ type: 'activate', roomId: DEFAULT_ROOM })
            writeLastRoom(DEFAULT_ROOM)
            await run(DEFAULT_ROOM)
          }
        }
      }
      return run(roomId)
    },
    [transport],
  )

  const selectRoom = useCallback(
    (roomId: string) => {
      dispatch({ type: 'activate', roomId })
      writeLastRoom(roomId)
      const room = stateRef.current.byRoom[roomId]
      if (!room?.joined && !room?.loading && stateRef.current.status === 'connected') {
        void join(roomId)
      }
    },
    [join],
  )

  const deliver = useCallback(
    async (clientId: string, roomId: string, text: string) => {
      try {
        const message = await transport.sendMessage({ roomId, text, clientId })
        dispatch({ type: 'confirmed', clientId, message })
      } catch (error) {
        dispatch({ type: 'failed', clientId })
        if (error instanceof TransportError && error.code === 'RATE_LIMITED') {
          notify(error.message)
        }
      }
    },
    [transport, notify],
  )

  // Wire transport events -> reducer, and connect for the lifetime of the session.
  useEffect(() => {
    const handleConnected = () => {
      const current = stateRef.current
      const roomIds = new Set(
        Object.entries(current.byRoom)
          .filter(([, room]) => room.joined || room.loading)
          .map(([roomId]) => roomId),
      )
      const active = current.activeRoomId ?? readLastRoom() ?? DEFAULT_ROOM
      if (!current.activeRoomId) {
        dispatch({ type: 'activate', roomId: active })
      }
      roomIds.add(active)
      // After a reconnect the server forgot our rooms: join them again and merge history.
      for (const roomId of roomIds) void join(roomId)
    }

    const unsubscribers = [
      transport.on('status', (status) => {
        dispatch({ type: 'status', status })
        if (status === 'connected') handleConnected()
      }),
      transport.on('rooms:update', (rooms) => dispatch({ type: 'rooms', rooms })),
      transport.on('message:new', (message) => dispatch({ type: 'received', message })),
      transport.on('presence:update', (payload) => dispatch({ type: 'presence', payload })),
      transport.on('typing:update', (payload) => dispatch({ type: 'typing', payload })),
      transport.on('auth:expired', () => onLogoutRef.current()),
    ]
    transport.connect(session)

    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe()
      transport.disconnect()
    }
  }, [transport, session, join])

  const actions = useMemo<ChatActions>(
    () => ({
      selectRoom,

      async createRoom(name) {
        const room = await transport.createRoom(name)
        selectRoom(room.id)
      },

      leaveRoom(roomId) {
        transport.leaveRoom(roomId)
        dispatch({ type: 'left', roomId })
        if (stateRef.current.activeRoomId === roomId) {
          const fallback = Object.keys(stateRef.current.byRoom).find(
            (id) => id !== roomId && stateRef.current.byRoom[id]?.joined,
          )
          selectRoom(fallback ?? DEFAULT_ROOM)
        }
      },

      sendMessage(text) {
        const { activeRoomId, self } = stateRef.current
        const trimmed = text.trim()
        if (!activeRoomId || !trimmed) return
        const clientId = crypto.randomUUID()
        dispatch({
          type: 'pending',
          message: {
            id: clientId,
            clientId,
            roomId: activeRoomId,
            author: self,
            text: trimmed,
            sentAt: Date.now(),
          },
        })
        void deliver(clientId, activeRoomId, trimmed)
      },

      retryMessage(clientId) {
        for (const room of Object.values(stateRef.current.byRoom)) {
          const entry = room.messages.find((message) => message.clientId === clientId)
          if (entry) {
            dispatch({ type: 'retrying', clientId })
            void deliver(clientId, entry.roomId, entry.text)
            return
          }
        }
      },

      startTyping: (roomId) => transport.startTyping(roomId),
      stopTyping: (roomId) => transport.stopTyping(roomId),
      dismissNotice: () => setNotice(null),
      logout: () => onLogoutRef.current(),
    }),
    [transport, selectRoom, deliver],
  )

  const value = useMemo<ChatContextState>(
    () => ({ ...state, mode: transport.mode, notice }),
    [state, transport.mode, notice],
  )

  return (
    <ChatActionsContext.Provider value={actions}>
      <ChatStateContext.Provider value={value}>{children}</ChatStateContext.Provider>
    </ChatActionsContext.Provider>
  )
}

function readLastRoom(): string | null {
  try {
    return localStorage.getItem(LAST_ROOM_KEY)
  } catch {
    return null
  }
}

function writeLastRoom(roomId: string) {
  try {
    localStorage.setItem(LAST_ROOM_KEY, roomId)
  } catch {
    // Not important enough to report.
  }
}
