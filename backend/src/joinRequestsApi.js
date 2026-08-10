import { Router } from 'express'
import { getDB } from './db.js'
import { requireAuth } from './authMiddleware.js'
import {
  createJoinRequest,
  getJoinRequest,
  getPendingRequestsForOwner,
  setRequestStatus,
  deleteJoinRequest,
} from './joinRequests.js'

const router = Router()

// Requester: create a pending request to join a room (PIN checked here
// too, so you can't spam requests without actually knowing the PIN).
router.post('/:roomId/join-requests', requireAuth, async (req, res) => {
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

  // The owner never needs approval to join their own room.
  if (room.ownerId === req.user.userId) {
    return res.json({ isOwner: true })
  }

  const requestId = await createJoinRequest(roomId, room.ownerId, req.user.userId, req.user.username)
  res.status(201).json({ isOwner: false, requestId })
})

// Requester: poll this to see if they've been approved/denied yet.
router.get('/join-requests/:requestId', requireAuth, async (req, res) => {
  const request = await getJoinRequest(req.params.requestId)
  if (!request) {
    return res.status(404).json({ error: 'request not found' })
  }
  if (request.userId !== req.user.userId) {
    return res.status(403).json({ error: 'not your request' })
  }
  res.json({ status: request.status, roomId: request.roomId })
})

// Requester: give up waiting.
router.post('/join-requests/:requestId/cancel', requireAuth, async (req, res) => {
  const request = await getJoinRequest(req.params.requestId)
  if (!request) {
    return res.status(404).json({ error: 'request not found' })
  }
  if (request.userId !== req.user.userId) {
    return res.status(403).json({ error: 'not your request' })
  }
  await deleteJoinRequest(req.params.requestId)
  res.json({ ok: true })
})

// Owner: all pending requests across every room they own — not scoped
// to one room, since the owner might not be inside any specific room
// when a request comes in.
router.get('/join-requests/pending/mine', requireAuth, async (req, res) => {
  const pending = await getPendingRequestsForOwner(req.user.userId)
  res.json({ pending })
})

// Owner: approve or deny a specific request.
async function ownerDecision(req, res, status) {
  const request = await getJoinRequest(req.params.requestId)
  if (!request) {
    return res.status(404).json({ error: 'request not found' })
  }
  if (request.ownerId !== req.user.userId) {
    return res.status(403).json({ error: 'only the room owner can decide this' })
  }
  await setRequestStatus(req.params.requestId, status)
  res.json({ ok: true })
}

router.post('/join-requests/:requestId/approve', requireAuth, (req, res) =>
  ownerDecision(req, res, 'approved')
)
router.post('/join-requests/:requestId/deny', requireAuth, (req, res) =>
  ownerDecision(req, res, 'denied')
)

export default router