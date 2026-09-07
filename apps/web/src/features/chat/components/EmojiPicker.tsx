import { useEffect, useRef, type KeyboardEvent } from 'react'
import { QUICK_EMOJIS } from '../lib/emojis'

interface EmojiPickerProps {
  id: string
  onPick: (emoji: string) => void
  onClose: () => void
}

/** A small, dependency-free emoji palette. Arrow keys move between emojis, Esc closes. */
export function EmojiPicker({ id, onPick, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.querySelector('button')?.focus()
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (ref.current?.contains(target)) return
      if ((target as Element).closest?.('[data-emoji-toggle]')) return
      onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [onClose])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }
    const columns = 8
    const moves: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: columns,
      ArrowUp: -columns,
    }
    const move = moves[event.key]
    if (move === undefined) return
    event.preventDefault()
    const buttons = [...(ref.current?.querySelectorAll('button') ?? [])]
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const next = buttons[Math.min(Math.max(index + move, 0), buttons.length - 1)]
    next?.focus()
  }

  return (
    <div
      ref={ref}
      id={id}
      className="emoji-picker"
      role="dialog"
      aria-label="Escolher emoji"
      onKeyDown={handleKeyDown}
    >
      <div className="emoji-picker__grid">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="emoji-picker__item"
            onClick={() => onPick(emoji)}
            aria-label={`Inserir ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
