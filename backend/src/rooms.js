/**
 * rooms.js
 *
 * This is the Sync Engine described in the project brief: one Y.Doc per
 * "room" (a SyncSpace session), broadcasting binary Yjs updates to every
 * connected client over a plain WebSocket.
 *
 * WHY THIS FILE EXISTS INSTEAD OF USING A LIBRARY DIRECTLY:
 * The npm package `y-websocket` (v3+) only ships the BROWSER side
 * (WebsocketProvider). The server-side helper that used to live in that
 * package (setupWSConnection) is not part of the current published
 * package. So we implement the same protocol here, directly on top of
 * `y-protocols`, which is the low-level building block Yjs itself is
 * built on. This is the standard approach — not a workaround.
 *
 * The wire protocol is simple: every message is either
 *   - a "sync" message (document updates), or
 *   - an "awareness" message (cursor position / user presence)
 * encoded with lib0's encoding/decoding helpers.
 */

import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1

// docName -> WSSharedDoc
const rooms = new Map()

/**
 * A Y.Doc extended with the bits needed to track connected clients and
 * their awareness state (cursor position, name, color) for one room.
 */
class WSSharedDoc extends Y.Doc {
  constructor(name) {
    super({ gc: true })
    this.name = name
    /** @type {Set<import('ws').WebSocket>} */
    this.conns = new Set()
    this.awareness = new awarenessProtocol.Awareness(this)
    this.awareness.setLocalState(null)

    this.awareness.on('update', ({ added, updated, removed }, origin) => {
      const changedClients = added.concat(updated, removed)
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      )
      const message = encoding.toUint8Array(encoder)
      this.conns.forEach((conn) => send(conn, message))
    })

    this.on('update', (update, origin) => {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_SYNC)
      syncProtocol.writeUpdate(encoder, update)
      const message = encoding.toUint8Array(encoder)
      this.conns.forEach((conn) => send(conn, message))
    })
  }
}

function send(conn, message) {
  if (conn.readyState !== conn.OPEN) return
  try {
    conn.send(message, (err) => {
      if (err) closeConnection(conn)
    })
  } catch (e) {
    closeConnection(conn)
  }
}

function getRoom(docName) {
  let doc = rooms.get(docName)
  if (!doc) {
    doc = new WSSharedDoc(docName)
    rooms.set(docName, doc)
    console.log(`[rooms] created room "${docName}"`)
  }
  return doc
}

function closeConnection(conn) {
  const doc = conn.doc
  if (doc) {
    doc.conns.delete(conn)
    awarenessProtocol.removeAwarenessStates(
      doc.awareness,
      [conn.clientId],
      null
    )
    // Free the room from memory once everyone leaves. Note: this means
    // in-memory-only state is lost when the last person disconnects —
    // Week 3's persistence layer (Mongo) is what fixes that; this file
    // intentionally only covers Week 1's in-memory sync engine.
    if (doc.conns.size === 0) {
      rooms.delete(doc.name)
      console.log(`[rooms] room "${doc.name}" emptied, removed from memory`)
    }
  }
  try {
    conn.close()
  } catch (e) {
    /* already closed */
  }
}

/**
 * Attach a raw WebSocket connection to a room. Call this from your
 * `wss.on('connection', ...)` handler.
 *
 * @param {import('ws').WebSocket} conn
 * @param {string} docName - the room/session id (e.g. from the URL path)
 */
export function setupWSConnection(conn, docName) {
  conn.binaryType = 'arraybuffer'
  const doc = getRoom(docName)
  conn.doc = doc
  conn.clientId = doc.awareness.clientID + Math.random() // uniqueness per socket, refined below
  doc.conns.add(conn)

  conn.on('message', (message) => {
    const data = new Uint8Array(message)
    const decoder = decoding.createDecoder(data)
    const messageType = decoding.readVarUint(decoder)

    switch (messageType) {
      case MESSAGE_SYNC: {
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, MESSAGE_SYNC)
        syncProtocol.readSyncMessage(decoder, encoder, doc, conn)
        // readSyncMessage may have queued a reply (e.g. step2 of the
        // handshake) — only send it if there's actual content beyond
        // the message-type header.
        if (encoding.length(encoder) > 1) {
          send(conn, encoding.toUint8Array(encoder))
        }
        break
      }
      case MESSAGE_AWARENESS: {
        awarenessProtocol.applyAwarenessUpdate(
          doc.awareness,
          decoding.readVarUint8Array(decoder),
          conn
        )
        break
      }
      default:
        console.warn('[rooms] unknown message type', messageType)
    }
  })

  conn.on('close', () => closeConnection(conn))
  conn.on('error', () => closeConnection(conn))

  // Kick off the sync handshake: tell the new client what we have.
  {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_SYNC)
    syncProtocol.writeSyncStep1(encoder, doc)
    send(conn, encoding.toUint8Array(encoder))

    const awarenessStates = doc.awareness.getStates()
    if (awarenessStates.size > 0) {
      const awEncoder = encoding.createEncoder()
      encoding.writeVarUint(awEncoder, MESSAGE_AWARENESS)
      encoding.writeVarUint8Array(
        awEncoder,
        awarenessProtocol.encodeAwarenessUpdate(
          doc.awareness,
          Array.from(awarenessStates.keys())
        )
      )
      send(conn, encoding.toUint8Array(awEncoder))
    }
  }
}

/** For a health/debug endpoint: how many rooms and connections are live. */
export function getRoomStats() {
  return Array.from(rooms.entries()).map(([name, doc]) => ({
    room: name,
    connections: doc.conns.size,
  }))
}
