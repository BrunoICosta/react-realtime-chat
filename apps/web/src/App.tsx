import { DEFAULT_ROOMS } from '@chat/shared'

export function App() {
  return (
    <main>
      <h1>Realtime Chat</h1>
      <ul>
        {DEFAULT_ROOMS.map((room) => (
          <li key={room.id}>#{room.name}</li>
        ))}
      </ul>
    </main>
  )
}
