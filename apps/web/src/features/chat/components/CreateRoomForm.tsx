import { LIMITS, createRoomSchema } from '@chat/shared'
import { useId, useState, type FormEvent, type KeyboardEvent } from 'react'
import { errorMessage } from '../../../core/transport/chat-transport'
import { Icon } from '../../../shared/components/Icon'

interface CreateRoomFormProps {
  onCreate: (name: string) => Promise<void>
  onClose: () => void
}

export function CreateRoomForm({ onCreate, onClose }: CreateRoomFormProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputId = useId()
  const errorId = useId()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = createRoomSchema.safeParse({ name })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Nome inválido')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onCreate(parsed.data.name)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === 'Escape') onClose()
  }

  return (
    <form className="create-room" onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate>
      <label htmlFor={inputId} className="visually-hidden">
        Nome da nova sala
      </label>
      <div className="create-room__row">
        <span className="create-room__hash" aria-hidden="true">
          #
        </span>
        <input
          id={inputId}
          className="input create-room__input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="nome-da-sala"
          maxLength={LIMITS.roomNameMax}
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          disabled={busy}
        />
        <button
          type="submit"
          className="icon-btn create-room__submit"
          aria-label="Criar sala"
          disabled={busy}
        >
          {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="check" />}
        </button>
      </div>
      {error && (
        <p className="create-room__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
