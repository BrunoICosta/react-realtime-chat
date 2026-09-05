import { useContext } from 'react'
import { ChatActionsContext, ChatStateContext } from './chat-context'
import { emptyRoom, type RoomState } from './chat-reducer'

export function useChatState() {
  const state = useContext(ChatStateContext)
  if (!state) throw new Error('useChatState must be used inside <ChatProvider>')
  return state
}

export function useChatActions() {
  const actions = useContext(ChatActionsContext)
  if (!actions) throw new Error('useChatActions must be used inside <ChatProvider>')
  return actions
}

const EMPTY_ROOM = emptyRoom()

/** State of the room currently on screen (an empty placeholder while none is selected). */
export function useActiveRoom(): { roomId: string | null; room: RoomState } {
  const { activeRoomId, byRoom } = useChatState()
  return {
    roomId: activeRoomId,
    room: (activeRoomId && byRoom[activeRoomId]) || EMPTY_ROOM,
  }
}
