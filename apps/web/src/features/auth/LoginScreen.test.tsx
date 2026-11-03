import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { i18n } from '../../core/i18n/i18n'
import { TransportError } from '../../core/transport/chat-transport'
import { LoginScreen } from './LoginScreen'

function setup(login = vi.fn(), mode: 'socket' | 'demo' = 'socket') {
  const onLoggedIn = vi.fn()
  render(
    <LoginScreen
      transport={{ login, mode }}
      onLoggedIn={onLoggedIn}
      theme="light"
      onToggleTheme={() => undefined}
    />,
  )
  return { login, onLoggedIn, user: userEvent.setup() }
}

describe('<LoginScreen />', () => {
  it('logs in with the trimmed nickname and the chosen color', async () => {
    const session = { token: 't', user: { id: '1', nickname: 'Ana', color: '#22c55e' } }
    const { login, onLoggedIn, user } = setup(vi.fn().mockResolvedValue(session))

    await user.type(screen.getByLabelText('Seu apelido'), '  Ana ')
    await user.click(screen.getByRole('radio', { name: 'Verde' }))
    await user.click(screen.getByRole('button', { name: 'Entrar no chat' }))

    expect(login).toHaveBeenCalledWith({ nickname: 'Ana', color: '#22c55e' })
    expect(onLoggedIn).toHaveBeenCalledWith(session)
  })

  it('validates the nickname before calling the server', async () => {
    const { login, user } = setup()
    await user.type(screen.getByLabelText('Seu apelido'), 'a{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent('ao menos 2 caracteres')
    expect(screen.getByLabelText('Seu apelido')).toHaveAttribute('aria-invalid', 'true')
    expect(login).not.toHaveBeenCalled()
  })

  it('shows server errors such as a nickname already in use', async () => {
    const login = vi.fn().mockRejectedValue(new TransportError('CONFLICT'))
    const { user } = setup(login)

    await user.type(screen.getByLabelText('Seu apelido'), 'Bia{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent('já está em uso')
    expect(screen.getByRole('button', { name: 'Entrar no chat' })).toBeEnabled()
  })

  it('shows the Portuguese app name in the heading and the tab title', () => {
    setup()
    expect(screen.getByRole('heading', { name: 'Chat em Tempo Real' })).toBeInTheDocument()
    expect(document.title).toBe('Chat em Tempo Real')
  })

  it('explains the demo mode when there is no server', () => {
    setup(vi.fn(), 'demo')
    expect(screen.getByText('modo demo')).toBeInTheDocument()
  })

  it('renders in English, including validation and server errors', async () => {
    await act(() => i18n.changeLanguage('en'))
    const login = vi.fn().mockRejectedValue(new TransportError('CONFLICT'))
    const { user } = setup(login, 'demo')

    expect(screen.getByRole('heading', { name: 'Realtime Chat' })).toBeInTheDocument()
    expect(screen.getByText('demo mode')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Green' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Your nickname'), 'a{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your nickname needs at least 2 characters.',
    )

    await user.type(screen.getByLabelText('Your nickname'), 'na{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('That nickname is in use right now.')
    expect(screen.getByRole('button', { name: 'Join the chat' })).toBeEnabled()
  })

  it('switches language without losing what was typed', async () => {
    const { user } = setup()
    await user.type(screen.getByLabelText('Seu apelido'), 'Ana')
    await act(() => i18n.changeLanguage('en'))
    expect(screen.getByLabelText('Your nickname')).toHaveValue('Ana')
  })
})
