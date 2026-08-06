import { Router } from 'express'
import { randomInt } from 'crypto'
import { getDB } from './db.js'
import { requireAuth } from './authMiddleware.js'
import { clearRoomPersistence } from './persistence.js'
import { clearRoomHistory } from './history.js'
import { forceCloseRoom } from './rooms.js'

const router = Router()

function generatePin() {
  // 6-digit numeric PIN, zero-padded (e.g. "004821")
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

router.post('/', requireAuth, async (req, res) => {
  const roomId = req.body?.roomId?.trim()
  if (!roomId) {
    return res.status(400).json({ error: 'roomId is required' })
  }

  const db = getDB()
  const existing = await db.collection('rooms').findOne({ _id: roomId })
  if (existing) {
    return res.status(409).json({ error: 'a room with this ID already exists' })
  }

  const pin = generatePin()
  await db.collection('rooms').insertOne({
    _id: roomId,
    ownerId: req.user.userId,
    pin,
    createdAt: new Date(),
  })

  res.status(201).json({ roomId, pin })
})

// Rooms the caller OWNS, including each one's PIN (so the owner can
// look it up again later — see auth-requirements.md for why the PIN is
// retrievable rather than hashed). This deliberately does NOT list
// rooms the caller merely joined via PIN but doesn't own — see the
// "out of scope" note in the requirements doc.
router.get('/', requireAuth, async (req, res) => {
  const db = getDB()
  const myRooms = await db
    .collection('rooms')
    .find({ ownerId: req.user.userId })
    .toArray()

  res.json(myRooms.map((r) => ({ roomId: r._id, pin: r.pin, createdAt: r.createdAt })))
})

// Pre-flight check used by the frontend BEFORE opening a WebSocket
// connection. The WebSocket upgrade handler in server.js is the REAL
// enforcement (this doesn't replace it) — this endpoint exists purely
// so a wrong PIN produces a clean, immediate error message, instead of
// y-websocket's auto-reconnect silently retrying the same bad
// credentials forever in the background with no clear feedback.
router.delete('/:roomId', requireAuth, async (req, res) => {
  const { roomId } = req.params
  const db = getDB()

  const room = await db.collection('rooms').findOne({ _id: roomId })
  if (!room) {
    return res.status(404).json({ error: 'no room with that ID exists' })
  }
  if (room.ownerId !== req.user.userId) {
    return res.status(403).json({ error: 'only the room owner can delete it' })
  }

  // Disconnect anyone currently active BEFORE removing the room record,
  // so a reconnect attempt mid-deletion still gets a clean rejection.
  forceCloseRoom(roomId, 'Room deleted by owner')

  await db.collection('rooms').deleteOne({ _id: roomId })
  await clearRoomPersistence(roomId)
  await clearRoomHistory(roomId)

  res.json({ ok: true })
})
router.post('/:roomId/verify', requireAuth, async (req, res) => {
  const { roomId } = req.params
  const { pin } = req.body || {}

  const db = getDB()
  const room = await db.collection('rooms').findOne({ _id: roomId })

  if (!room) {
    return res.status(404).json({ error: 'no room with that ID exists' })
  }
  if (room.pin !== pin) {
    return res.status(403).json({ error: 'incorrect PIN' })
  }

  res.json({ ok: true })
})

export default router