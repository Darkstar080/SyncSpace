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
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#232338_0%,var(--color-bg)_60%)]">
      <form
        onSubmit={submit}
        className="bg-bg-panel border border-border rounded-xl p-10 w-90 flex flex-col gap-4"
      >
        <h1 className="m-0 text-3xl tracking-tight bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
          SyncSpace
        </h1>
        <p className="m-0 text-text-dim text-sm">
          Real-time collaborative whiteboard &amp; code editor
        </p>

        <label className="flex flex-col gap-1.5 text-sm text-text-dim">
          Your name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Priya"
            autoFocus
            className="bg-bg-deep border border-border rounded-md px-3 py-2.5 text-text text-sm focus:outline-2 focus:outline-accent focus:outline-offset-1"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-text-dim">
          Room ID
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="e.g. interview-42"
            className="bg-bg-deep border border-border rounded-md px-3 py-2.5 text-text text-sm focus:outline-2 focus:outline-accent focus:outline-offset-1"
          />
        </label>

        <button
          type="submit"
          className="mt-2 bg-accent text-bg-deep rounded-md py-3 font-semibold text-sm cursor-pointer hover:brightness-110"
        >
          Join room
        </button>
        <p className="m-0 text-xs text-text-dim">
          Share the same Room ID with someone else and open this in two
          tabs to test sync.
        </p>
      </form>
    </div>
  )
}