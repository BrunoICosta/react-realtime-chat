import { LIMITS } from '@chat/shared'
import { useCallback, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Icon } from '../../../shared/components/Icon'
import { EmojiPicker } from './EmojiPicker'
import './Composer.css'

interface ComposerProps {
  roomName: string
  disabled?: boolean
  disabledReason?: string
  onSend: (text: string) => void
  onTyping?: () => void
  onStopTyping?: () => void
}

const MAX_HEIGHT = 168

/**
 * Message input: Enter sends, Shift+Enter breaks the line, IME composition is respected,
 * the textarea grows with its content and a quick emoji palette inserts at the caret.
 */
export function Composer({
  roomName,
  disabled = false,
  disabledReason,
  onSend,
  onTyping,
  onStopTyping,
}: ComposerProps) {
  const [text, setText] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pickerId = useId()
  const counterId = useId()

  const remaining = LIMITS.messageMax - text.length
  const canSend = !disabled && text.trim().length > 0 && remaining >= 0

  // Auto-grow: reset to measure the content, then clamp.
  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT)}px`
  }, [text])

  function submit() {
    if (!canSend) return
    onSend(text)
    onStopTyping?.()
    setText('')
    textareaRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    submit()
  }

  const insertEmoji = useCallback(
    (emoji: string) => {
      const textarea = textareaRef.current
      const start = textarea?.selectionStart ?? text.length
      const end = textarea?.selectionEnd ?? text.length
      const next = text.slice(0, start) + emoji + text.slice(end)
      setText(next)
      setPickerOpen(false)
      onTyping?.()
      requestAnimationFrame(() => {
        if (!textarea) return
        textarea.focus()
        const caret = start + emoji.length
        textarea.setSelectionRange(caret, caret)
      })
    },
    [text, onTyping],
  )

  const closePicker = useCallback(() => {
    setPickerOpen(false)
    textareaRef.current?.focus()
  }, [])

  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      {pickerOpen && <EmojiPicker id={pickerId} onPick={insertEmoji} onClose={closePicker} />}

      <div className="composer__box" data-disabled={disabled || undefined}>
        <button
          type="button"
          className="icon-btn composer__emoji"
          aria-label="Inserir emoji"
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          aria-controls={pickerOpen ? pickerId : undefined}
          data-emoji-toggle
          onClick={() => setPickerOpen((open) => !open)}
          disabled={disabled}
        >
          <Icon name="smile" />
        </button>

        <label className="visually-hidden" htmlFor={`${pickerId}-input`}>
          Mensagem para #{roomName}
        </label>
        <textarea
          id={`${pickerId}-input`}
          ref={textareaRef}
          className="composer__input"
          rows={1}
          value={text}
          placeholder={disabled ? (disabledReason ?? 'Conectando…') : `Mensagem para #${roomName}`}
          onChange={(event) => {
            setText(event.target.value)
            if (event.target.value.trim()) onTyping?.()
            else onStopTyping?.()
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => onStopTyping?.()}
          disabled={disabled}
          aria-describedby={remaining < 100 ? counterId : undefined}
          enterKeyHint="send"
        />

        <button
          type="submit"
          className="composer__send"
          aria-label="Enviar mensagem"
          disabled={!canSend}
        >
          <Icon name="send" size={18} />
        </button>
      </div>

      <div className="composer__hints">
        <span className="composer__shortcut">
          <kbd>Enter</kbd> envia · <kbd>Shift</kbd> + <kbd>Enter</kbd> quebra a linha
        </span>
        {remaining < 100 && (
          <span
            id={counterId}
            className="composer__counter"
            data-over={remaining < 0 || undefined}
            aria-live="polite"
          >
            {remaining < 0
              ? `${-remaining} caracteres acima do limite`
              : `${remaining} caracteres restantes`}
          </span>
        )}
      </div>
    </form>
  )
}
