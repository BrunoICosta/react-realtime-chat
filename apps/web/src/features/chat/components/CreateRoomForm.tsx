import { LIMITS, createRoomSchema, validationCodeOf } from '@chat/shared'
import { useId, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useErrorText } from '../../../core/i18n/error-text'
import { toErrorInfo, type ErrorInfo } from '../../../core/transport/chat-transport'
import { Icon } from '../../../shared/components/Icon'

interface CreateRoomFormProps {
  onCreate: (name: string) => Promise<void>
  onClose: () => void
}

export function CreateRoomForm({ onCreate, onClose }: CreateRoomFormProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<ErrorInfo | null>(null)
  const errorText = useErrorText()
  const [busy, setBusy] = useState(false)
  const inputId = useId()
  const errorId = useId()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = createRoomSchema.safeParse({ name })
    if (!parsed.success) {
      setError({ code: 'VALIDATION', detail: validationCodeOf(parsed.error) })
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onCreate(parsed.data.name)
      onClose()
    } catch (err) {
      setError(toErrorInfo(err))
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
          {errorText(error, 'room')}
        </p>
      )}
    </form>
  )
}
