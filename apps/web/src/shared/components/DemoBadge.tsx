import './DemoBadge.css'

/** Tells the visitor this build has no server behind it (GitHub Pages). */
export function DemoBadge() {
  return (
    <span
      className="demo-badge"
      title="Sem servidor: as mensagens trafegam entre as abas deste navegador via BroadcastChannel"
    >
      <span className="demo-badge__dot" aria-hidden="true" />
      modo demo
    </span>
  )
}
