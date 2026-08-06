/**
 * persistence.js
 *
 * Saves and restores room state to/from MongoDB, using `y-mongodb-provider`
 * (a purpose-built Yjs<->Mongo binding — same idea as using `y-monaco`
 * instead of hand-writing the Monaco binding).
 *
 * DESIGN DECISION: fail gracefully, not loudly.
 * If MongoDB is unreachable, rooms still work fully in real time — they
 * just don't persist across a restart or a room emptying out. This is a
 * deliberate choice: the live collaboration feature has nothing to do
 * with MongoDB, so a database outage shouldn't take down the thing that
 * doesn't need it. The tradeoff: if Mongo is down, nobody using the app
 * is told — only this server's own logs and the /health endpoint reveal
 * it. Check those if you suspect persistence isn't working.
 */

import { MongoClient } from 'mongodb'
import { MongodbPersistence } from 'y-mongodb-provider'
import * as Y from 'yjs'

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/syncspace'
const COLLECTION = 'room_snapshots'
const PING_TIMEOUT_MS = 3000

let mdb = null
let available = false

/**
 * Call this once at server startup, before accepting connections.
 * Does a bounded connectivity check up front — y-mongodb-provider itself
 * connects lazily on first real query, which would mean an outage isn't
 * discovered until the first room tries to save. Checking explicitly here
 * means we know (and log) the persistence status before any real traffic
 * arrives.
 */
export async function initPersistence() {
  const pingClient = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: PING_TIMEOUT_MS,
  })
  try {
    await pingClient.connect()
    await pingClient.db().command({ ping: 1 })
    available = true
    console.log('[persistence] MongoDB reachable — rooms will be saved and restored')
  } catch (err) {
    available = false
    console.warn('[persistence] MongoDB unreachable — running IN-MEMORY ONLY.')
    console.warn('[persistence] Rooms will NOT survive a server restart or emptying out.')
    console.warn(`[persistence] reason: ${err.message}`)
  } finally {
    await pingClient.close().catch(() => {})
  }

  if (available) {
    mdb = new MongodbPersistence(MONGO_URI, { collectionName: COLLECTION })
  }
}

export function isAvailable() {
  return available
}

/**
 * Load a room's previously saved state as a Yjs update, ready to apply
 * directly via Y.applyUpdate(doc, update). Returns null if persistence is
 * unavailable, or if this room has never been saved before.
 */
export async function loadRoomUpdate(docName) {
  if (!available) return null
  try {
    const ydoc = await mdb.getYDoc(docName)
    const update = Y.encodeStateAsUpdate(ydoc)
    // An empty, never-saved doc still encodes to a couple of bytes —
    // treat anything that small as "nothing was actually saved."
    return update.length > 2 ? update : null
  } catch (err) {
    console.warn(`[persistence] failed to load room "${docName}": ${err.message}`)
    return null
  }
}

/**
 * Save a single incremental update for a room. Call this every time the
 * room's Y.Doc changes — y-mongodb-provider is built to handle frequent
 * small writes like this (it batches/merges them internally), so there's
 * no need to debounce or buffer updates ourselves.
 *
 * No-ops silently if persistence is unavailable — callers don't need to
 * check isAvailable() themselves.
 */
export async function saveRoomUpdate(docName, update) {
  if (!available) return
  try {
    await mdb.storeUpdate(docName, update)
  } catch (err) {
    console.warn(`[persistence] failed to save room "${docName}": ${err.message}`)
  }
}

/**
 * Optional hygiene: merge a room's incremental updates into one compact
 * entry. Safe to call when a room empties out. Not required for
 * correctness — every update is already durably saved as it happens.
 */
export async function flushRoom(docName) {
  if (!available) return
  try {
    await mdb.flushDocument(docName)
  } catch (err) {
    console.warn(`[persistence] failed to flush room "${docName}": ${err.message}`)
  }
}

export async function clearRoomPersistence(docName) {
  if (!available) return
  try {
    await mdb.clearDocument(docName)
  } catch (err) {
    console.warn(`[persistence] failed to clear room "${docName}": ${err.message}`)
  }
}

export async function closePersistence() {
  if (mdb) {
    await mdb.destroy().catch(() => {})
  }
}