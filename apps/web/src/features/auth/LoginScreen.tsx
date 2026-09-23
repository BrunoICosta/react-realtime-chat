import { AVATAR_COLORS, LIMITS, loginSchema, validationCodeOf } from '@chat/shared'
import { useId, useState, type FormEvent } from 'react'
import { useErrorText } from '../../core/i18n/error-text'
import {
  toErrorInfo,
  type ChatTransport,
  type ErrorInfo,
  type Session,
} from '../../core/transport/chat-transport'
import type { Theme } from '../../core/theme/use-theme'
import { Avatar } from '../../shared/components/Avatar'
import { DemoBadge } from '../../shared/components/DemoBadge'
import { Icon } from '../../shared/components/Icon'
import { LanguageSwitcher } from '../../shared/components/LanguageSwitcher'
import { ThemeToggle } from '../../shared/components/ThemeToggle'
import './LoginScreen.css'

interface LoginScreenProps {
  transport: Pick<ChatTransport, 'login' | 'mode'>
  onLoggedIn: (session: Session) => void
  theme: Theme
  onToggleTheme: () => void
}

const COLOR_NAMES: Record<string, string> = {
  '#6366f1': 'Índigo',
  '#0ea5e9': 'Azul',
  '#14b8a6': 'Turquesa',
  '#22c55e': 'Verde',
  '#eab308': 'Amarelo',
  '#f97316': 'Laranja',
  '#ef4444': 'Vermelho',
  '#ec4899': 'Rosa',
  '#a855f7': 'Roxo',
}

export function LoginScreen({ transport, onLoggedIn, theme, onToggleTheme }: LoginScreenProps) {
  const [nickname, setNickname] = useState('')
  const [color, setColor] = useState<string>(AVATAR_COLORS[0])
  const [error, setError] = useState<ErrorInfo | null>(null)
  const errorText = useErrorText()
  const [submitting, setSubmitting] = useState(false)
  const nicknameId = useId()
  const hintId = useId()
  const errorId = useId()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = loginSchema.safeParse({ nickname, color })
    if (!parsed.success) {
      setError({ code: 'VALIDATION', detail: validationCodeOf(parsed.error) })
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      onLoggedIn(await transport.login(parsed.data))
    } catch (err) {
      setError(toErrorInfo(err))
      setSubmitting(false)
    }
  }

  const preview = { nickname: nickname.trim() || '?', color }

  return (
    <div className="login">
      <div className="login__toolbar">
        <LanguageSwitcher />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      <main className="login__card">
        <header className="login__header">
          <span className="login__logo" aria-hidden="true">
            <Icon name="sparkles" size={26} />
          </span>
          <h1 className="login__title">Realtime Chat</h1>
          <p className="login__subtitle">
            Salas, presença online e indicador de digitação em tempo real.
          </p>
          {transport.mode === 'demo' && (
            <p className="login__demo">
              <DemoBadge />
              <span>Sem servidor aqui: abra outra aba para conversar entre elas.</span>
            </p>
          )}
        </header>

        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor={nicknameId}>
              Seu apelido
            </label>
            <input
              id={nicknameId}
              className="input"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="Como quer ser chamado?"
              autoComplete="nickname"
              autoFocus
              maxLength={LIMITS.nicknameMax}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            />
            <span className="field__hint" id={hintId}>
              De {LIMITS.nicknameMin} a {LIMITS.nicknameMax} caracteres. Sem cadastro, sem senha.
            </span>
          </div>

          <fieldset className="login__colors">
            <legend className="field__label">Cor do avatar</legend>
            <div className="login__swatches">
              {AVATAR_COLORS.map((swatch) => (
                <label key={swatch} className="login__swatch" title={COLOR_NAMES[swatch]}>
                  <input
                    type="radio"
                    name="avatar-color"
                    value={swatch}
                    checked={color === swatch}
                    onChange={() => setColor(swatch)}
                    className="visually-hidden"
                  />
                  <span style={{ background: swatch }} aria-hidden="true" />
                  <span className="visually-hidden">{COLOR_NAMES[swatch] ?? swatch}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="login__preview" aria-hidden="true">
            <Avatar user={preview} size="lg" />
            <div>
              <strong>{nickname.trim() || 'Seu apelido'}</strong>
              <span>é assim que vão te ver no chat</span>
            </div>
          </div>

          {error && (
            <p className="alert alert--error" role="alert" id={errorId}>
              <Icon name="alert" size={18} />
              {errorText(error, 'nickname')}
            </p>
          )}

          <button type="submit" className="btn btn--primary login__submit" disabled={submitting}>
            {submitting ? <span className="spinner" aria-hidden="true" /> : null}
            {submitting ? 'Entrando…' : 'Entrar no chat'}
          </button>
        </form>
      </main>

      <footer className="login__footer">
        Feito com React, Socket.io e TypeScript por{' '}
        <a href="https://github.com/BrunoICosta" target="_blank" rel="noreferrer">
          Bruno Costa
        </a>
      </footer>
    </div>
  )
}
