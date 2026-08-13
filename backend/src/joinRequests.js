/**
 * joinRequests.js
 *
 * Backs the "owner must approve joins" feature. A non-owner who knows
 * a room's PIN doesn't connect immediately anymore — they create a
 * pending request here, which the owner must explicitly approve.
 *
 * Design choice (confirmed explicitly, not assumed): if the owner isn't
 * currently around, the requester waits — there's no fallback to
 * PIN-only access. This means a request can sit pending indefinitely;
 * the requester can cancel their own request at any time.
 */

import { getDB } from './db.js'
import { ObjectId } from 'mongodb'

const COLLECTION = 'join_requests'

export async function createJoinRequest(roomId, ownerId, userId, username) {
  const db = getDB()
  const result = await db.collection(COLLECTION).insertOne({
    roomId,
    ownerId,
    userId,
    username,
    status: 'pending',
    createdAt: new Date(),
  })
  return result.insertedId.toString()
}

export async function getJoinRequest(requestId) {
  const db = getDB()
  return db.collection(COLLECTION).findOne({ _id: new ObjectId(requestId) })
}

/** All pending requests across every room owned by this user. */
export async function getPendingRequestsForOwner(ownerId) {
  const db = getDB()
  const docs = await db
    .collection(COLLECTION)
    .find({ ownerId, status: 'pending' })
    .sort({ createdAt: 1 })
    .toArray()
  return docs.map((d) => ({
    requestId: d._id.toString(),
    roomId: d.roomId,
    username: d.username,
    createdAt: d.createdAt,
  }))
}

export async function setRequestStatus(requestId, status) {
  const db = getDB()
  await db
    .collection(COLLECTION)
    .updateOne({ _id: new ObjectId(requestId) }, { $set: { status } })
}

export async function deleteJoinRequest(requestId) {
  const db = getDB()
  await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(requestId) })
}