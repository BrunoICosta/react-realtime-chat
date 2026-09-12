import type { ChatMessage, RoomSummary } from '@chat/shared'
import { describe, expect, it } from 'vitest'
import { chatReducer, createInitialState, mergeHistory, type ChatState } from './chat-reducer'

const self = { id: 'me', nickname: 'Eu', color: '#6366f1' }
const ana = { id: 'ana', nickname: 'Ana', color: '#22c55e' }

const room = (id: string, onlineCount = 1): RoomSummary => ({
  id,
  name: id,
  createdAt: 0,
  createdBy: null,
  onlineCount,
})

const message = (id: string, roomId: string, sentAt: number, author = ana): ChatMessage => ({
  id,
  roomId,
  author,
  text: `msg ${id}`,
  sentAt,
})

function joinedState(...roomIds: string[]): ChatState {
  let state = createInitialState(self)
  for (const roomId of roomIds) {
    state = chatReducer(state, {
      type: 'joined',
      result: { room: room(roomId), history: [], users: [self] },
    })
  }
  return chatReducer(state, { type: 'activate', roomId: roomIds[0] ?? 'geral' })
}

describe('chatReducer', () => {
  it('remembers that the connection succeeded at least once', () => {
    let state = createInitialState(self)
    state = chatReducer(state, { type: 'status', status: 'connected' })
    state = chatReducer(state, { type: 'status', status: 'reconnecting' })
    expect(state).toMatchObject({ status: 'reconnecting', everConnected: true })
  })

  it('stores history, users and the room summary on join', () => {
    const state = chatReducer(createInitialState(self), {
      type: 'joined',
      result: { room: room('geral', 2), history: [message('1', 'geral', 1)], users: [self, ana] },
    })
    expect(state.byRoom.geral).toMatchObject({ joined: true, loading: false, users: [self, ana] })
    expect(state.byRoom.geral?.messages).toHaveLength(1)
    expect(state.rooms).toEqual([room('geral', 2)])
  })

  it('counts unread messages only for rooms in the background', () => {
    let state = joinedState('geral', 'dev')
    state = chatReducer(state, { type: 'received', message: message('1', 'dev', 10) })
    state = chatReducer(state, { type: 'received', message: message('2', 'dev', 11) })
    state = chatReducer(state, { type: 'received', message: message('3', 'geral', 12) })
    expect(state.byRoom.dev?.unread).toBe(2)
    expect(state.byRoom.geral?.unread).toBe(0)

    state = chatReducer(state, { type: 'activate', roomId: 'dev' })
    expect(state.byRoom.dev?.unread).toBe(0)
  })

  it('ignores duplicates and messages for rooms that were not joined', () => {
    let state = joinedState('geral')
    state = chatReducer(state, { type: 'received', message: message('1', 'geral', 10) })
    state = chatReducer(state, { type: 'received', message: message('1', 'geral', 10) })
    state = chatReducer(state, { type: 'received', message: message('2', 'random', 10) })
    expect(state.byRoom.geral?.messages).toHaveLength(1)
    expect(state.byRoom.random).toBeUndefined()
  })

  it('reconciles an optimistic message with the server copy', () => {
    let state = joinedState('geral')
    state = chatReducer(state, {
      type: 'pending',
      message: { ...message('tmp', 'geral', 5, self), clientId: 'tmp' },
    })
    expect(state.byRoom.geral?.messages[0]?.status).toBe('pending')

    state = chatReducer(state, { type: 'failed', clientId: 'tmp' })
    expect(state.byRoom.geral?.messages[0]?.status).toBe('failed')

    state = chatReducer(state, { type: 'retrying', clientId: 'tmp' })
    state = chatReducer(state, {
      type: 'confirmed',
      clientId: 'tmp',
      message: { ...message('srv-1', 'geral', 6, self), clientId: 'tmp' },
    })
    expect(state.byRoom.geral?.messages).toEqual([
      expect.objectContaining({ id: 'srv-1', status: 'sent' }),
    ])
  })

  it('drops the author from the typing list when their message arrives', () => {
    let state = joinedState('geral')
    state = chatReducer(state, { type: 'typing', payload: { roomId: 'geral', users: [ana, self] } })
    expect(state.byRoom.geral?.typing).toEqual([ana])

    state = chatReducer(state, { type: 'received', message: message('1', 'geral', 1) })
    expect(state.byRoom.geral?.typing).toEqual([])
  })

  it('keeps messages ordered even if they arrive out of order', () => {
    let state = joinedState('geral')
    state = chatReducer(state, { type: 'received', message: message('b', 'geral', 20) })
    state = chatReducer(state, { type: 'received', message: message('a', 'geral', 10) })
    expect(state.byRoom.geral?.messages.map((entry) => entry.id)).toEqual(['a', 'b'])
  })

  it('forgets a room when leaving it', () => {
    let state = joinedState('geral', 'dev')
    state = chatReducer(state, { type: 'activate', roomId: 'dev' })
    state = chatReducer(state, { type: 'left', roomId: 'dev' })
    expect(state.byRoom.dev).toBeUndefined()
    expect(state.activeRoomId).toBeNull()
  })
})

describe('mergeHistory', () => {
  it('merges a re-join history without duplicates and keeps unsent messages last', () => {
    const current = [
      { ...message('1', 'geral', 1), status: 'sent' as const },
      { ...message('tmp', 'geral', 3, self), clientId: 'tmp', status: 'failed' as const },
    ]
    const history = [message('1', 'geral', 1), message('2', 'geral', 2)]
    expect(mergeHistory(current, history).map((entry) => entry.id)).toEqual(['1', '2', 'tmp'])
  })

  it('drops pending messages that the server already stored', () => {
    const current = [
      { ...message('tmp', 'geral', 3, self), clientId: 'tmp', status: 'pending' as const },
    ]
    const history = [{ ...message('srv', 'geral', 3, self), clientId: 'tmp' }]
    expect(mergeHistory(current, history)).toEqual([
      expect.objectContaining({ id: 'srv', status: 'sent' }),
    ])
  })
})
