import { Router } from 'express'
import { getDB } from './db.js'
import { requireAuth } from './authMiddleware.js'
import { getHistoryIndex, getHistorySnapshot } from './history.js'
import { forceHistorySnapshotIfActive } from './rooms.js'

const router = Router()

/** Same PIN check as roomsApi.js's /verify — history is exactly as
 * sensitive as the room's live content. */
async function checkRoomAccess(req, res) {
  const { roomId } = req.params
  const pin = req.query.pin
  const db = getDB()
  const room = await db.collection('rooms').findOne({ _id: roomId })

  if (!room) {
    res.status(404).json({ error: 'no room with that ID exists' })
    return null
  }
  if (room.pin !== pin) {
    res.status(403).json({ error: 'incorrect PIN' })
    return null
  }
  return room
}

router.get('/:roomId/history', requireAuth, async (req, res) => {
  const room = await checkRoomAccess(req, res)
  if (!room) return

  // Ensure the most recent activity is actually captured before
  // listing what's available.
  await forceHistorySnapshotIfActive(req.params.roomId)

  const timestamps = await getHistoryIndex(req.params.roomId)
  res.json({ timestamps })
})

router.get('/:roomId/history/:timestamp', requireAuth, async (req, res) => {
  const room = await checkRoomAccess(req, res)
  if (!room) return

  const snapshot = await getHistorySnapshot(req.params.roomId, req.params.timestamp)
  if (!snapshot) {
    return res.status(404).json({ error: 'no snapshot found for that timestamp' })
  }

  res.json({ snapshot: Buffer.from(snapshot).toString('base64') })
})

export default router