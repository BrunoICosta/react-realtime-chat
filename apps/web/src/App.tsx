import { useCallback, useState } from 'react'
import { clearSession, loadSession, saveSession } from './core/session/session-storage'
import type { Session } from './core/transport/chat-transport'
import { createTransport } from './core/transport/create-transport'
import { useTheme } from './core/theme/use-theme'
import { LoginScreen } from './features/auth/LoginScreen'
import { ChatScreen } from './features/chat/ChatScreen'
import { ChatProvider } from './features/chat/state/ChatProvider'

const transport = createTransport()

export function App() {
  const { theme, toggleTheme } = useTheme()
  const [session, setSession] = useState<Session | null>(() => loadSession(transport.mode))

  function handleLoggedIn(next: Session) {
    saveSession(transport.mode, next)
    setSession(next)
  }

  // Stable so the provider does not reconnect when App re-renders (e.g. theme change).
  const handleLogout = useCallback(() => {
    clearSession(transport.mode)
    setSession(null)
  }, [])

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
    <ChatProvider transport={transport} session={session} onLogout={handleLogout}>
      <ChatScreen />
    </ChatProvider>
  )
}
