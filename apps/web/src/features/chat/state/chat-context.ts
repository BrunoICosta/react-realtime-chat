import { createContext } from 'react'
import type { ErrorInfo, TransportMode } from '../../../core/transport/chat-transport'
import type { ChatState } from './chat-reducer'

export interface ChatNotice {
  id: number
  error: ErrorInfo
}

export interface ChatContextState extends ChatState {
  mode: TransportMode
  notice: ChatNotice | null
}

export interface ChatActions {
  selectRoom(roomId: string): void
  createRoom(name: string): Promise<void>
  leaveRoom(roomId: string): void
  sendMessage(text: string): void
  retryMessage(clientId: string): void
  startTyping(roomId: string): void
  stopTyping(roomId: string): void
  dismissNotice(): void
  logout(): void
}

export const ChatStateContext = createContext<ChatContextState | null>(null)
export const ChatActionsContext = createContext<ChatActions | null>(null)
