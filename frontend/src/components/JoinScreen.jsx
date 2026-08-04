import { useEffect, useState } from 'react'
import { createRoom, getMyRooms, getUsername, clearSession, verifyRoomAccess, deleteRoom } from '../lib/api'
import { motion, AnimatePresence } from 'framer-motion'

export default function JoinScreen({ onJoin, onLogout, theme, onToggleTheme }) {
  const [myRooms, setMyRooms] = useState([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [roomsError, setRoomsError] = useState('')

  const [newRoomId, setNewRoomId] = useState('')
  const [createdRoom, setCreatedRoom] = useState(null)
  const [createError, setCreateError] = useState('')

  const [joinRoomId, setJoinRoomId] = useState('')
  const [joinPin, setJoinPin] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    refreshRooms()
  }, [])

  async function refreshRooms() {
    setLoadingRooms(true)
    setRoomsError('')
    try {
      const rooms = await getMyRooms()
      setMyRooms(rooms)
    } catch (err) {
      setRoomsError(err.message)
    } finally {
      setLoadingRooms(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setCreateError('')
    if (!newRoomId.trim()) return
    try {
      const room = await createRoom(newRoomId.trim())
      setCreatedRoom(room)
      setNewRoomId('')
      refreshRooms()
    } catch (err) {
      setCreateError(err.message)
    }
  }

  async function handleDelete(roomId) {
    const confirmed = window.confirm(`Delete room "${roomId}"? This permanently removes it and everything in it — this cannot be undone.`)
    if (!confirmed) return

    try {
      await deleteRoom(roomId)
      refreshRooms()
    } catch (err) {
      alert(`Failed to delete room: ${err.message}`)
    }
  }

  async function attemptJoin(room, pin) {
    setJoinError('')
    setJoining(true)
    try {
      await verifyRoomAccess(room, pin)
      onJoin({ room, pin })
    } catch (err) {
      setJoinError(err.message)
    } finally {
      setJoining(false)
    }
  }

  function handleJoin(e) {
    e.preventDefault()
    if (!joinRoomId.trim() || !joinPin.trim()) {
      setJoinError('Room ID and PIN are both required')
      return
    }
    attemptJoin(joinRoomId.trim(), joinPin.trim())
  }

  function handleLogout() {
    clearSession()
    onLogout()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg relative overflow-hidden p-6 font-sans">
      {/* 3D Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex justify-center items-center">
        <motion.div
          animate={{ rotate: -360, scale: [1, 1.2, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute w-[900px] h-[900px] bg-accent/5 rounded-full blur-[150px] -top-1/4 -right-1/4"
        />
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.3, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute w-[700px] h-[700px] bg-mauve/10 rounded-full blur-[120px] bottom-[-20%] left-[-10%]"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md flex flex-col gap-6 relative z-10"
      >
        <div className="flex items-center justify-between bg-bg-panel/40 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-xl">
          <div>
            <h1 className="m-0 text-xl font-bold bg-gradient-to-r from-accent to-mauve bg-clip-text text-transparent tracking-tight">
              SyncSpace
            </h1>
            <p className="m-0 text-text-dim text-xs mt-0.5">Welcome, <span className="text-text font-medium">{getUsername()}</span></p>
          </div>
          <div className="flex items-center gap-2.5">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="text-sm text-text-dim border border-border/50 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer hover:text-text hover:bg-bg-deep/50 transition-colors"
            >
              {theme === 'dark' ? '☀' : '☾'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-2/10 text-accent-2 border border-accent-2/30 hover:bg-accent-2 hover:text-white transition-all cursor-pointer shadow-[0_0_10px_rgba(243,139,168,0.1)]"
            >
              Log out
            </motion.button>
          </div>
        </div>

        {/* Join an existing room */}
        <motion.form
          whileHover={{ y: -2 }}
          onSubmit={handleJoin}
          className="bg-bg-panel/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 flex flex-col gap-4 shadow-lg transition-transform"
        >
          <h2 className="m-0 text-sm font-semibold text-text flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent"></span> Join a room
          </h2>
          <div className="flex gap-2">
            <input
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              placeholder="Room ID"
              className="flex-1 bg-bg-deep/50 border border-border/50 rounded-xl px-4 py-2.5 text-text text-sm focus:outline-none focus:border-accent focus:bg-bg-deep transition-colors"
            />
            <input
              value={joinPin}
              onChange={(e) => setJoinPin(e.target.value)}
              placeholder="PIN"
              maxLength={6}
              className="w-24 bg-bg-deep/50 border border-border/50 rounded-xl px-4 py-2.5 text-text text-sm focus:outline-none focus:border-accent focus:bg-bg-deep transition-colors"
            />
          </div>
          {joinError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="m-0 text-xs text-accent-2">{joinError}</motion.p>}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={joining}
            className="bg-gradient-to-r from-accent to-accent/80 text-bg-deep rounded-xl py-2.5 font-bold text-sm cursor-pointer shadow-[0_4px_15px_rgba(137,180,250,0.3)] disabled:opacity-50 transition-all"
          >
            {joining ? 'Checking…' : 'Join Room'}
          </motion.button>
        </motion.form>

        {/* Create a new room */}
        <motion.form
          whileHover={{ y: -2 }}
          onSubmit={handleCreate}
          className="bg-bg-panel/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 flex flex-col gap-4 shadow-lg transition-transform"
        >
          <h2 className="m-0 text-sm font-semibold text-text flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-mauve"></span> Create a new room
          </h2>
          <div className="flex gap-2">
            <input
              value={newRoomId}
              onChange={(e) => setNewRoomId(e.target.value)}
              placeholder="Room ID (e.g. daily-sync)"
              className="flex-1 bg-bg-deep/50 border border-border/50 rounded-xl px-4 py-2.5 text-text text-sm focus:outline-none focus:border-mauve focus:bg-bg-deep transition-colors"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="bg-mauve/10 border border-mauve/30 text-mauve rounded-xl px-5 text-sm font-semibold cursor-pointer hover:bg-mauve hover:text-bg-deep transition-all shadow-[0_0_10px_rgba(203,166,247,0.1)]"
            >
              Create
            </motion.button>
          </div>
          {createError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="m-0 text-xs text-accent-2">{createError}</motion.p>}
          
          <AnimatePresence>
            {createdRoom && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-bg-deep/80 border border-border/50 rounded-xl p-4 text-sm mt-2 overflow-hidden"
              >
                <p className="m-0 text-text-dim text-xs mb-2">Room created! Share these details:</p>
                <div className="flex flex-col gap-1 font-mono">
                  <p className="m-0 text-text">ID: <span className="text-mauve font-semibold">{createdRoom.roomId}</span></p>
                  <p className="m-0 text-text">PIN: <span className="text-mauve font-semibold">{createdRoom.pin}</span></p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>

        {/* My rooms - owner view */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-bg-panel/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 flex flex-col gap-4 shadow-lg transition-transform"
        >
          <h2 className="m-0 text-sm font-semibold text-text flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-peach"></span> My rooms
          </h2>
          {loadingRooms && <p className="m-0 text-xs text-text-dim animate-pulse">Loading rooms…</p>}
          {roomsError && <p className="m-0 text-xs text-accent-2">{roomsError}</p>}
          {!loadingRooms && myRooms.length === 0 && (
            <p className="m-0 text-xs text-text-dim italic">You don't own any rooms yet.</p>
          )}
          
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {myRooms.map((r) => (
                <motion.div
                  key={r.roomId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group flex items-center justify-between bg-bg-deep/50 border border-border/50 rounded-xl px-4 py-3 text-sm hover:border-peach/30 transition-colors"
                >
                  <span className="text-text font-medium">{r.roomId}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-text-dim text-xs font-mono bg-bg-panel px-2 py-1 rounded">PIN: {r.pin}</span>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => attemptJoin(r.roomId, r.pin)}
                      disabled={joining}
                      className="text-xs font-semibold bg-peach/10 text-peach border border-peach/30 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-peach hover:text-bg-deep transition-all disabled:opacity-50"
                    >
                      Join
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDelete(r.roomId)}
                      className="text-xs text-accent-2/70 cursor-pointer bg-transparent border-none hover:text-accent-2 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Delete
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}