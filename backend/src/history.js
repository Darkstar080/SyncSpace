/**
 * history.js
 *
 * Stores periodic full-state snapshots for replay — a SEPARATE,
 * append-only collection from persistence.js's incremental updates.
 * This is deliberate: persistence.js's storage gets compacted
 * (merged/flushed) for database hygiene, which would silently destroy
 * fine-grained replay history if we tried to reuse it. Snapshots here
 * are never compacted or deleted (aside from the cap below).
 *
 * Scope: replay shows periodic checkpoints (see rooms.js for the
 * interval), not a scrub-every-keystroke timeline. That's an honest,
 * disclosed limitation — full per-update replay would be a much bigger
 * feature.
 */

import { getDB } from './db.js'

const COLLECTION = 'room_history'
const MAX_SNAPSHOTS_PER_ROOM = 200 // prevents unbounded growth for a long-running room

export async function saveHistorySnapshot(docName, update) {
  try {
    const db = getDB()
    const timestamp = Date.now()
    await db.collection(COLLECTION).insertOne({
      docName,
      timestamp,
      snapshot: Buffer.from(update),
    })
    console.log(`[history] saved snapshot for "${docName}" at ${timestamp}, ${update.length} bytes`)

    // Trim oldest snapshots beyond the cap for this room.

    const count = await db.collection(COLLECTION).countDocuments({ docName })
    if (count > MAX_SNAPSHOTS_PER_ROOM) {
      const excess = count - MAX_SNAPSHOTS_PER_ROOM
      const oldest = await db
        .collection(COLLECTION)
        .find({ docName })
        .sort({ timestamp: 1 })
        .limit(excess)
        .toArray()
      await db.collection(COLLECTION).deleteMany({
        _id: { $in: oldest.map((d) => d._id) },
      })
    }
  } catch (err) {
    console.warn(`[history] failed to save snapshot for "${docName}": ${err.message}`)
  }
}

/** List of available snapshot timestamps for a room, oldest first. */
export async function getHistoryIndex(docName) {
  const db = getDB()
  const docs = await db
    .collection(COLLECTION)
    .find({ docName })
    .sort({ timestamp: 1 })
    .project({ timestamp: 1 })
    .toArray()
  return docs.map((d) => d.timestamp)
}

/** Delete all history snapshots for a room (used when the room is deleted). */
export async function clearRoomHistory(docName) {
  const db = getDB()
  await db.collection(COLLECTION).deleteMany({ docName })
}

/** The raw Yjs update bytes for one specific snapshot. */
export async function getHistorySnapshot(docName, timestamp) {
  const db = getDB()
  const doc = await db.collection(COLLECTION).findOne({
    docName,
    timestamp: Number(timestamp),
  })
  console.log(`[history] lookup "${docName}" @ ${timestamp} ->`, doc ? `found, ${doc.snapshot.length()} bytes` : 'NOT FOUND')
  return doc ? new Uint8Array(doc.snapshot.buffer, doc.snapshot.byteOffset, doc.snapshot.byteLength) : null
}