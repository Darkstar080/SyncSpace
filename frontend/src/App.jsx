import { useEffect, useRef, useState } from 'react'
import AuthScreen from './components/AuthScreen'
import JoinScreen from './components/JoinScreen'
import Whiteboard from './components/Whiteboard'
import CodeEditor from './components/CodeEditor'
import ConnectionBanner from './components/ConnectionBanner'
import { createRoomConnection, destroyRoomConnection, randomColor } from './lib/yjs'
import { getToken, getUsername, clearSession } from './lib/api'
import { getInitialTheme, applyToDocument, setExplicitTheme, watchSystemTheme, hasExplicitPreference } from './lib/theme'
import ChatButton from './components/Chat/ChatButton'
import ChatWindow from './components/Chat/ChatWindow'
import { AIButton, AIPanel } from "./components/AIAssistant";


export default function App() {
  const [username, setUsername] = useState(getUsername())
  const [connection, setConnection] = useState(null)
  const [status, setStatus] = useState('disconnected')
  const [users, setUsers] = useState([])
  const [theme, setTheme] = useState(() => getInitialTheme())
  const connectionRef = useRef(null)
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);

  useEffect(() => {
    applyToDocument(theme)
  }, [theme])

  // Follow the OS's light/dark setting live — but ONLY if the user has
  // never explicitly toggled the theme themselves. An explicit choice
  // always wins and is never silently overridden by a system change.
  useEffect(() => {
    return watchSystemTheme((systemTheme) => {
      if (!hasExplicitPreference()) {
        setTheme(systemTheme)
      }
    })
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setExplicitTheme(next) // persists the explicit choice
    setTheme(next)
  }

  function handleJoin({ room, pin }) {
    const user = { name: username, color: randomColor() }
    const token = getToken()
    const conn = createRoomConnection(room, user, { token, pin })
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

  function handleLeaveRoom() {
    destroyRoomConnection(connectionRef.current)
    connectionRef.current = null
    setConnection(null)
    setUsers([])
    setStatus('disconnected')
  }

  function handleSessionExpired() {
    clearSession()
    handleLeaveRoom()
    setUsername(null)
  }

  useEffect(() => {
    return () => destroyRoomConnection(connectionRef.current)
  }, [])

  if (!username) {
    return <AuthScreen onAuthenticated={(name) => setUsername(name)} />
  }

  if (!connection) {
    return (
      <JoinScreen
        onJoin={handleJoin}
        onLogout={() => {
          setUsername(null)
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="h-13 flex-shrink-0 flex items-center justify-between px-5 bg-bg-panel border-b border-border">
        <div className="flex items-center gap-3">
          <span className="font-bold tracking-tight text-text">SyncSpace</span>
          <span className="text-xs text-text-dim bg-bg-deep px-2.5 py-1 rounded-full border border-border">
            Room: {connection.roomName}
          </span>
          <button
            onClick={handleLeaveRoom}
            className="text-xs text-text-dim underline cursor-pointer bg-transparent border-none"
          >
            Leave room
          </button>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="text-xs text-text-dim border border-border rounded-full px-2.5 py-1 cursor-pointer hover:text-text"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
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

      <ConnectionBanner
        status={status}
        provider={connection.provider}
        onSessionExpired={handleSessionExpired}
      />

      <main className="flex-1 flex min-h-0">
        <Whiteboard shapes={connection.shapes} awareness={connection.awareness} />
        <CodeEditor codeText={connection.codeText} awareness={connection.awareness} theme={theme} />
      </main>

      <AIButton
          onClick={() => setIsAIOpen(true)}
        />

        <ChatButton
          onClick={() => {
            setIsChatOpen(true);
          }}
        />

      <ChatButton
        onClick={() => {
          console.log("clicked");
          setIsChatOpen(true);
        }}
      />
      <ChatWindow
        chatMessages={connection.chatMessages}
        awareness={connection.awareness}
        isOpen={isChatOpen}
        isMinimized={isMinimized}
        onMinimize={() => setIsMinimized((prev) => !prev)}
        onClose={() => {
          setIsChatOpen(false);
          setIsMinimized(false);
        }}
      />
      <AIPanel
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
      />
    </div>
  )
}