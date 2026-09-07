import type { PublicUser } from '@chat/shared'
import { typingText } from '../lib/typing-text'
import './TypingIndicator.css'

export function TypingIndicator({ users }: { users: PublicUser[] }) {
  const text = typingText(users)
  return (
    // The live region is always mounted so screen readers announce changes reliably.
    <div className="typing" aria-live="polite" aria-atomic="true">
      {text && (
        <>
          <span className="typing__dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="typing__text">{text}</span>
        </>
      )}
    </div>
  )
}
