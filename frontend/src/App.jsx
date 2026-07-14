import { useEffect, useRef, useState } from 'react'
import JoinScreen from './components/JoinScreen'
import Whiteboard from './components/Whiteboard'
import CodeEditor from './components/CodeEditor'
import { createRoomConnection, destroyRoomConnection, randomColor } from './lib/yjs'
import './App.css'

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
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand">SyncSpace</span>
          <span className="room-badge">Room: {connection.roomName}</span>
        </div>
        <div className="topbar-right">
          <span className={`status-dot ${status}`} />
          <span className="status-label">{status}</span>
          <div className="presence">
            {users.map((u, i) => (
              <span key={i} className="presence-chip" style={{ background: u.color }}>
                {u.name}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="split">
        <Whiteboard shapes={connection.shapes} awareness={connection.awareness} />
        <CodeEditor codeText={connection.codeText} awareness={connection.awareness} />
      </main>
    </div>
  )
}
