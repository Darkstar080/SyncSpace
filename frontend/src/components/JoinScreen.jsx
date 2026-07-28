import { useEffect, useState } from 'react'
import { createRoom, getMyRooms, getUsername, clearSession, verifyRoomAccess } from '../lib/api'

export default function JoinScreen({ onJoin, onLogout, theme, onToggleTheme }) {
  const [myRooms, setMyRooms] = useState([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [roomsError, setRoomsError] = useState('')

  const [newRoomId, setNewRoomId] = useState('')
  const [createdRoom, setCreatedRoom] = useState(null) // { roomId, pin } - shown once, freshest
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

  async function attemptJoin(room, pin) {
    setJoinError('')
    setJoining(true)
    try {
      // Pre-flight check over plain HTTP: gives a clean, immediate error
      // for a wrong PIN or nonexistent room, instead of opening a
      // WebSocket that the server will reject and y-websocket will then
      // silently keep retrying in the background.
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
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,var(--color-bg-deep)_0%,var(--color-bg)_60%)] p-6">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="m-0 text-2xl tracking-tight bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
              SyncSpace
            </h1>
            <p className="m-0 text-text-dim text-xs mt-1">Signed in as {getUsername()}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="text-xs text-text-dim border border-border rounded-full px-2.5 py-1 cursor-pointer hover:text-text"
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-text-dim underline cursor-pointer bg-transparent border-none"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Join an existing room */}
        <form
          onSubmit={handleJoin}
          className="bg-bg-panel border border-border rounded-xl p-6 flex flex-col gap-3"
        >
          <h2 className="m-0 text-sm font-medium text-text">Join a room</h2>
          <div className="flex gap-2">
            <input
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              placeholder="Room ID"
              className="flex-1 bg-bg-deep border border-border rounded-md px-3 py-2 text-text text-sm focus:outline-2 focus:outline-accent"
            />
            <input
              value={joinPin}
              onChange={(e) => setJoinPin(e.target.value)}
              placeholder="PIN"
              maxLength={6}
              className="w-24 bg-bg-deep border border-border rounded-md px-3 py-2 text-text text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
          {joinError && <p className="m-0 text-xs text-accent-2">{joinError}</p>}
          <button
            type="submit"
            disabled={joining}
            className="bg-accent text-bg-deep rounded-md py-2.5 font-semibold text-sm cursor-pointer hover:brightness-110 disabled:opacity-50"
          >
            {joining ? 'Checking…' : 'Join room'}
          </button>
        </form>

        {/* Create a new room */}
        <form
          onSubmit={handleCreate}
          className="bg-bg-panel border border-border rounded-xl p-6 flex flex-col gap-3"
        >
          <h2 className="m-0 text-sm font-medium text-text">Create a new room</h2>
          <div className="flex gap-2">
            <input
              value={newRoomId}
              onChange={(e) => setNewRoomId(e.target.value)}
              placeholder="Choose a Room ID, e.g. interview-42"
              className="flex-1 bg-bg-deep border border-border rounded-md px-3 py-2 text-text text-sm focus:outline-2 focus:outline-accent"
            />
            <button
              type="submit"
              className="bg-transparent border border-accent text-accent rounded-md px-4 text-sm cursor-pointer hover:bg-accent hover:text-bg-deep"
            >
              Create
            </button>
          </div>
          {createError && <p className="m-0 text-xs text-accent-2">{createError}</p>}
          {createdRoom && (
            <div className="bg-bg-deep border border-border rounded-md p-3 text-sm">
              <p className="m-0 text-text-dim text-xs">Room created — share these with your team:</p>
              <p className="m-0 mt-1 text-text">
                Room ID: <span className="text-accent font-semibold">{createdRoom.roomId}</span>
              </p>
              <p className="m-0 text-text">
                PIN: <span className="text-accent font-semibold">{createdRoom.pin}</span>
              </p>
            </div>
          )}
        </form>

        {/* My rooms - owner view, PIN always visible again here */}
        <div className="bg-bg-panel border border-border rounded-xl p-6 flex flex-col gap-3">
          <h2 className="m-0 text-sm font-medium text-text">My rooms</h2>
          {loadingRooms && <p className="m-0 text-xs text-text-dim">Loading…</p>}
          {roomsError && <p className="m-0 text-xs text-accent-2">{roomsError}</p>}
          {!loadingRooms && myRooms.length === 0 && (
            <p className="m-0 text-xs text-text-dim">You don't own any rooms yet.</p>
          )}
          <div className="flex flex-col gap-2">
            {myRooms.map((r) => (
              <div
                key={r.roomId}
                className="flex items-center justify-between bg-bg-deep border border-border rounded-md px-3 py-2 text-sm"
              >
                <span className="text-text">{r.roomId}</span>
                <div className="flex items-center gap-3">
                  <span className="text-text-dim text-xs">PIN: {r.pin}</span>
                  <button
                    onClick={() => attemptJoin(r.roomId, r.pin)}
                    disabled={joining}
                    className="text-xs bg-accent text-bg-deep rounded px-2.5 py-1 cursor-pointer hover:brightness-110 disabled:opacity-50"
                  >
                    Join
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}