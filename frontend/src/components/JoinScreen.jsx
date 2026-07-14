import { useState } from 'react'

export default function JoinScreen({ onJoin }) {
  const [name, setName] = useState('')
  const [room, setRoom] = useState('interview-room')

  function submit(e) {
    e.preventDefault()
    if (!name.trim() || !room.trim()) return
    onJoin({ name: name.trim(), room: room.trim() })
  }

  return (
    <div className="join-screen">
      <form className="join-card" onSubmit={submit}>
        <h1>SyncSpace</h1>
        <p className="subtitle">Real-time collaborative whiteboard &amp; code editor</p>

        <label>
          Your name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Priya"
            autoFocus
          />
        </label>

        <label>
          Room ID
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="e.g. interview-42"
          />
        </label>

        <button type="submit">Join room</button>
        <p className="hint">
          Share the same Room ID with someone else and open this in two
          tabs to test sync.
        </p>
      </form>
    </div>
  )
}
