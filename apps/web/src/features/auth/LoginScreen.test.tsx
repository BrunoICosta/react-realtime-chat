import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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
    const login = vi
      .fn()
      .mockRejectedValue(new TransportError('CONFLICT', 'Esse apelido já está em uso agora'))
    const { user } = setup(login)

    await user.type(screen.getByLabelText('Seu apelido'), 'Bia{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent('já está em uso')
    expect(screen.getByRole('button', { name: 'Entrar no chat' })).toBeEnabled()
  })

  it('explains the demo mode when there is no server', () => {
    setup(vi.fn(), 'demo')
    expect(screen.getByText('modo demo')).toBeInTheDocument()
  })
})
