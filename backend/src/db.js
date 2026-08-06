/**
 * db.js
 *
 * A MongoDB connection dedicated to our own application data: user
 * accounts and room metadata (owner, PIN). This is DELIBERATELY
 * different from persistence.js's philosophy:
 *
 * - persistence.js (Yjs document snapshots): fails gracefully. Real-time
 *   collaboration doesn't need MongoDB moment-to-moment, so a database
 *   outage shouldn't take down the live features.
 * - db.js (this file, auth + room access): fails LOUDLY. Login, room
 *   creation, and PIN checks are meaningless without a database — there
 *   is no sensible "in-memory fallback" for user accounts. If this
 *   can't connect, the server should refuse to start rather than run in
 *   a broken half-working state.
 */

import { MongoClient } from 'mongodb'
import dns from 'node:dns'

// Work around a known issue on Node.js v22+ / Windows: Node doesn't
// always correctly use the OS's configured DNS resolver, which can
// break the SRV DNS lookup that `mongodb+srv://` connection strings
// depend on — producing a "querySrv ECONNREFUSED" error that has
// nothing to do with your actual network, VPN, or firewall. Explicitly
// pointing at public DNS resolvers sidesteps this. Harmless if you were
// never affected by this issue in the first place.
dns.setServers(['8.8.8.8', '1.1.1.1'])

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/syncspace'

let client = null
let db = null

/**
 * Call this once at startup. Throws on failure — callers should let
 * that crash startup, not swallow it (see the rationale above).
 */
export async function connectDB() {
  // 5s was too aggressive for some networks — a slower (but not
  // actually blocked) path to Atlas's servers could time out here even
  // though the connection would succeed given a bit more time. This
  // doesn't fix an actual network block, just avoids a false failure
  // on a marginal connection.
  client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 20000 })
  await client.connect()
  db = client.db() // uses the database name embedded in MONGODB_URI

  // Enforce uniqueness at the database level too, not just in
  // application code — protects against a race where two register
  // requests for the same username arrive at nearly the same time.
  await db.collection('users').createIndex({ username: 1 }, { unique: true })

  console.log('[db] connected to MongoDB for auth/rooms data')
}

export function getDB() {
  if (!db) {
    throw new Error('Database not connected — connectDB() must be called and awaited at startup first.')
  }
  return db
}

export async function closeDB() {
  if (client) {
    await client.close()
  }
}