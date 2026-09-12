import type { ChatMessage } from '@chat/shared'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FakeTransport } from '../../test/fake-transport'
import { ChatScreen } from './ChatScreen'
import { ChatProvider } from './state/ChatProvider'

const me = { id: 'me', nickname: 'Eu', color: '#6366f1' }
const ana = { id: 'ana', nickname: 'Ana', color: '#22c55e' }

function message(id: string, roomId: string, text: string, author = ana): ChatMessage {
  return { id, roomId, text, author, sentAt: Date.now() }
}

async function renderChat(transport = new FakeTransport()) {
  render(
    <ChatProvider transport={transport} session={{ token: 't', user: me }} onLogout={() => {}}>
      <ChatScreen theme="light" onToggleTheme={() => {}} />
    </ChatProvider>,
  )
  await screen.findByRole('heading', { name: 'geral' })
  return { transport, user: userEvent.setup() }
}

describe('<ChatScreen /> with a transport', () => {
  it('joins #geral on connect and renders its history', async () => {
    const transport = new FakeTransport()
    transport.history.geral = [message('1', 'geral', 'Bem-vindos!')]
    await renderChat(transport)

    expect(await screen.findByText('Bem-vindos!')).toBeInTheDocument()
    expect(transport.joinRoom).toHaveBeenCalledWith('geral')
  })

  it('shows an empty state for a quiet room', async () => {
    await renderChat()
    expect(await screen.findByText('Que tal dizer oi?')).toBeInTheDocument()
  })

  it('sends a message optimistically and confirms it', async () => {
    const { transport, user } = await renderChat()
    const input = await screen.findByLabelText('Mensagem para #geral')
    await user.type(input, 'primeira mensagem{Enter}')

    expect(await screen.findByText('primeira mensagem')).toBeInTheDocument()
    expect(transport.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: 'geral', text: 'primeira mensagem' }),
    )
    expect(screen.queryByText('enviando…')).not.toBeInTheDocument()
  })

  it('offers a retry when delivery fails', async () => {
    const transport = new FakeTransport()
    transport.sendMessage.mockRejectedValueOnce(new Error('timeout'))
    const { user } = await renderChat(transport)

    await user.type(await screen.findByLabelText('Mensagem para #geral'), 'vai falhar{Enter}')
    await user.click(await screen.findByRole('button', { name: 'Tentar de novo' }))

    expect(transport.sendMessage).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Não enviada.')).not.toBeInTheDocument()
  })

  it('shows who is typing', async () => {
    const { transport } = await renderChat()
    act(() => transport.emit('typing:update', { roomId: 'geral', users: [ana, me] }))
    expect(screen.getByText('Ana está digitando...')).toBeInTheDocument()
  })

  it('counts unread messages of background rooms', async () => {
    const { transport, user } = await renderChat()
    await user.click(screen.getByRole('button', { name: /dev/ }))
    await screen.findByRole('heading', { name: 'dev' })
    await user.click(screen.getByRole('button', { name: /geral/ }))

    act(() => transport.emit('message:new', message('m1', 'dev', 'psiu')))
    act(() => transport.emit('message:new', message('m2', 'dev', 'psiu de novo')))

    const rooms = screen.getByRole('navigation', { name: /Salas/ })
    expect(within(rooms).getByLabelText('2 mensagens não lidas')).toBeInTheDocument()
  })

  it('warns while reconnecting and re-joins rooms when back', async () => {
    const { transport } = await renderChat()
    act(() => transport.emit('status', 'reconnecting'))
    expect(screen.getByText('Conexão perdida. Tentando reconectar…')).toBeInTheDocument()
    expect(screen.getByLabelText('Mensagem para #geral')).toBeDisabled()

    transport.joinRoom.mockClear()
    await act(async () => transport.emit('status', 'connected'))
    expect(screen.getByText('Conexão restabelecida')).toBeInTheDocument()
    expect(transport.joinRoom).toHaveBeenCalledWith('geral')
  })
})
