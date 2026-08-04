import { useEffect, useRef, useState } from 'react'
import AuthScreen from './components/AuthScreen'
import JoinScreen from './components/JoinScreen'
import Whiteboard from './components/Whiteboard'
import CodeEditor from './components/CodeEditor'
import ConnectionBanner from './components/ConnectionBanner'
import ReplayModal from './components/ReplayModal'
import { createRoomConnection, destroyRoomConnection, randomColor } from './lib/yjs'
import { getToken, getUsername, clearSession } from './lib/api'
import { getInitialTheme, applyToDocument, setExplicitTheme, watchSystemTheme, hasExplicitPreference } from './lib/theme'
import ChatButton from './components/Chat/ChatButton'
import ChatWindow from './components/Chat/ChatWindow'
import { AIButton, AIPanel } from "./components/AIAssistant";
import { motion } from 'framer-motion';


export default function App() {
  const [username, setUsername] = useState(getUsername())
  const [connection, setConnection] = useState(null)
  const [status, setStatus] = useState('disconnected')
  const [users, setUsers] = useState([])
  const [theme, setTheme] = useState(() => getInitialTheme())
  const [currentPin, setCurrentPin] = useState(null)
  const [showReplay, setShowReplay] = useState(false)
  const connectionRef = useRef(null)
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showSelectionAI, setShowSelectionAI] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");
  const [selectionPosition, setSelectionPosition] = useState({
  x: 0,
  y: 0,
});
const [aiPrompt, setAiPrompt] = useState("");

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
    setCurrentPin(pin) // needed later so Replay can authenticate its own requests

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
    <div className="h-screen flex flex-col bg-bg overflow-hidden relative">
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="h-14 flex-shrink-0 flex items-center justify-between px-6 bg-bg-panel/60 backdrop-blur-xl border-b border-border/50 z-20 shadow-sm"
      >
        <div className="flex items-center gap-4">
          <motion.span whileHover={{ scale: 1.05 }} className="font-bold text-lg tracking-tight bg-gradient-to-r from-accent to-mauve bg-clip-text text-transparent cursor-default">
            SyncSpace
          </motion.span>
          <span className="text-xs font-mono text-text-dim bg-bg-deep/50 px-3 py-1.5 rounded-lg border border-border/50">
            Room: <span className="text-text">{connection.roomName}</span>
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLeaveRoom}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-2/10 text-accent-2 border border-accent-2/30 hover:bg-accent-2 hover:text-white transition-all cursor-pointer shadow-[0_0_10px_rgba(243,139,168,0.1)]"
          >
            Leave room
          </motion.button>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="text-sm text-text-dim border border-border/50 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer hover:text-text hover:bg-bg-deep/50 transition-colors"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowReplay(true)}
            className="text-xs font-semibold text-text-dim border border-border/50 bg-bg-deep/30 rounded-lg px-3 py-1.5 cursor-pointer hover:text-text hover:border-text-dim/50 transition-all"
          >
            History
          </motion.button>
          <div className="flex items-center gap-2 bg-bg-deep/40 px-3 py-1.5 rounded-lg border border-border/30">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'connected'
                  ? 'bg-success shadow-[0_0_8px_var(--color-success)]'
                  : status === 'disconnected'
                  ? 'bg-accent-2 shadow-[0_0_8px_var(--color-accent-2)]'
                  : 'bg-text-dim'
              }`}
            />
            <span className="text-xs font-medium text-text-dim capitalize">{status}</span>
          </div>
          <div className="flex gap-1.5 ml-2">
            {users.map((u, i) => (
              <motion.span
                whileHover={{ y: -2 }}
                key={i}
                className="text-xs px-2.5 py-1 rounded-full text-bg-deep font-bold shadow-md"
                style={{ background: u.color }}
                title={u.name}
              >
                {u.name.charAt(0).toUpperCase() + u.name.slice(1, 2)}
              </motion.span>
            ))}
          </div>
        </div>
      </motion.header>

      <ConnectionBanner
        status={status}
        provider={connection.provider}
        onSessionExpired={handleSessionExpired}
      />

      <main className="flex-1 flex min-h-0">
        <div className="relative flex-1 min-w-0">
          <Whiteboard
            shapes={connection.shapes}
            awareness={connection.awareness}
          />

         <AIPanel
          isOpen={isAIOpen}
          onClose={() => setIsAIOpen(false)}
          aiPrompt={aiPrompt}
          setAiPrompt={setAiPrompt}
        />
        </div>
       <CodeEditor
          codeText={connection.codeText}
          awareness={connection.awareness}
          theme={theme}
          setSelectedCode={setSelectedCode}
          setShowSelectionAI={setShowSelectionAI}
          setSelectionPosition={setSelectionPosition}
        />
      </main>

{/* REPLAY FEATURE */}
      {showReplay && (
        <ReplayModal
          roomId={connection.roomName}
          pin={currentPin}
          onClose={() => setShowReplay(false)}
        />
      )}

      {/* AI SELECTION BUTTON */}
      {showSelectionAI && (
        <button
          onClick={() => {
            setAiPrompt(selectedCode);
            setIsAIOpen(true);
          }}
          style={{
            position: "fixed",
            left: selectionPosition.x,
            top: selectionPosition.y,
          }}
          className="z-50 px-2 py-1 rounded-md bg-violet-600 text-white text-xs shadow-lg hover:bg-violet-700"
        >
          ✨ Ask AI
        </button>
      )}

      {/* FLOATING ACTION BUTTONS */}
      <AIButton
        onClick={() => setIsAIOpen(true)}
      />

      <ChatButton
        onClick={() => {
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
    </div>
  )
}