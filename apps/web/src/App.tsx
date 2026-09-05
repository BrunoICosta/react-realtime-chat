import { useState } from 'react'
import { clearSession, loadSession, saveSession } from './core/session/session-storage'
import type { Session } from './core/transport/chat-transport'
import { createTransport } from './core/transport/create-transport'
import { useTheme } from './core/theme/use-theme'
import { LoginScreen } from './features/auth/LoginScreen'

const transport = createTransport()

export function App() {
  const { theme, toggleTheme } = useTheme()
  const [session, setSession] = useState<Session | null>(() => loadSession(transport.mode))

  function handleLoggedIn(next: Session) {
    saveSession(transport.mode, next)
    setSession(next)
  }

  function handleLogout() {
    transport.disconnect()
    clearSession(transport.mode)
    setSession(null)
  }

  if (!session) {
    return (
      <LoginScreen
        transport={transport}
        onLoggedIn={handleLoggedIn}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    )
  }

  return (
    <main style={{ padding: 24 }}>
      <p>Olá, {session.user.nickname}!</p>
      <button type="button" className="btn btn--ghost" onClick={handleLogout}>
        Sair
      </button>
    </main>
  )
}
