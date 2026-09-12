import { LIMITS } from '@chat/shared'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Composer } from './Composer'

function setup(props: Partial<Parameters<typeof Composer>[0]> = {}) {
  const handlers = { onSend: vi.fn(), onTyping: vi.fn(), onStopTyping: vi.fn() }
  render(<Composer roomName="geral" {...handlers} {...props} />)
  return {
    ...handlers,
    input: screen.getByLabelText('Mensagem para #geral'),
    user: userEvent.setup(),
  }
}

describe('<Composer />', () => {
  it('sends on Enter and clears the input', async () => {
    const { input, onSend, onStopTyping, user } = setup()
    await user.type(input, 'Olá{Enter}')

    expect(onSend).toHaveBeenCalledWith('Olá')
    expect(onStopTyping).toHaveBeenCalled()
    expect(input).toHaveValue('')
  })

  it('inserts a line break on Shift+Enter instead of sending', async () => {
    const { input, onSend, user } = setup()
    await user.type(input, 'linha 1{Shift>}{Enter}{/Shift}linha 2')

    expect(onSend).not.toHaveBeenCalled()
    expect(input).toHaveValue('linha 1\nlinha 2')
  })

  it('does not send while an IME composition is in progress', () => {
    const { input, onSend } = setup()
    fireEvent.change(input, { target: { value: 'にほん' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('ignores blank messages', async () => {
    const { input, onSend, user } = setup()
    await user.type(input, '   {Enter}')
    expect(onSend).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled()
  })

  it('reports typing activity', async () => {
    const { input, onTyping, user } = setup()
    await user.type(input, 'oi')
    expect(onTyping).toHaveBeenCalled()
  })

  it('inserts emojis from the picker at the caret', async () => {
    const { input, user } = setup()
    await user.type(input, 'bom dia')
    await user.click(screen.getByRole('button', { name: 'Inserir emoji' }))
    await user.click(screen.getByRole('button', { name: 'Inserir ☕' }))

    expect(input).toHaveValue('bom dia☕')
    expect(screen.queryByRole('dialog', { name: 'Escolher emoji' })).not.toBeInTheDocument()
  })

  it('warns when the message is over the limit', () => {
    const { input } = setup()
    fireEvent.change(input, { target: { value: 'a'.repeat(LIMITS.messageMax + 5) } })
    expect(screen.getByText('5 caracteres acima do limite')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled()
  })

  it('is disabled while offline', () => {
    const { input } = setup({ disabled: true, disabledReason: 'Sem conexão…' })
    expect(input).toBeDisabled()
    expect(input).toHaveAttribute('placeholder', 'Sem conexão…')
  })
})
