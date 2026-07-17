import { useEffect, useRef, useState } from 'react'
import JoinScreen from './components/JoinScreen'
import Whiteboard from './components/Whiteboard'
import CodeEditor from './components/CodeEditor'
import { createRoomConnection, destroyRoomConnection, randomColor } from './lib/yjs'

export default function App() {
  const [connection, setConnection] = useState(null)
  const [status, setStatus] = useState('disconnected')
  const [users, setUsers] = useState([])
  const connectionRef = useRef(null)

  function handleJoin({ name, room }) {
    const user = { name, color: randomColor() }
    const conn = createRoomConnection(room, user)
    conn.roomName = room
    connectionRef.current = conn
    setConnection(conn)

    conn.provider.on('status', ({ status }) => setStatus(status))

    const updateUsers = () => {
      const states = Array.from(conn.awareness.getStates().values())
      setUsers(states.map((s) => s.user).filter(Boolean))
    }
    conn.awareness.on('change', updateUsers)
    updateUsers()
  }

  useEffect(() => {
    return () => destroyRoomConnection(connectionRef.current)
  }, [])

  if (!connection) {
    return <JoinScreen onJoin={handleJoin} />
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="h-13 flex-shrink-0 flex items-center justify-between px-5 bg-bg-panel border-b border-border">
        <div className="flex items-center gap-3">
          <span className="font-bold tracking-tight">SyncSpace</span>
          <span className="text-xs text-text-dim bg-bg-deep px-2.5 py-1 rounded-full border border-border">
            Room: {connection.roomName}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'connected'
                ? 'bg-success shadow-[0_0_6px_var(--color-success)]'
                : status === 'disconnected'
                ? 'bg-accent-2'
                : 'bg-text-dim'
            }`}
          />
          <span className="text-xs text-text-dim capitalize">{status}</span>
          <div className="flex gap-1.5 ml-2.5">
            {users.map((u, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1 rounded-full text-bg-deep font-semibold"
                style={{ background: u.color }}
              >
                {u.name}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 flex min-h-0">
        <Whiteboard shapes={connection.shapes} awareness={connection.awareness} />
        <CodeEditor codeText={connection.codeText} awareness={connection.awareness} />
      </main>
    </div>
  )
}