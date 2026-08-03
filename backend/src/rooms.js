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

import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { loadRoomUpdate, saveRoomUpdate, flushRoom } from "./persistence.js";
import { saveHistorySnapshot } from "./history.js";

// How often (ms) to save a full snapshot for replay. Coarser than
// persistence's per-update saves on purpose — replay shows periodic
// checkpoints, not every keystroke.
const HISTORY_SNAPSHOT_INTERVAL_MS = 30_000;

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

// docName -> WSSharedDoc
const rooms = new Map();

/**
 * A Y.Doc extended with the bits needed to track connected clients and
 * their awareness state (cursor position, name, color) for one room.
 */
class WSSharedDoc extends Y.Doc {
  constructor(name) {
    super({ gc: true });
    this.name = name;
    /** @type {Set<import('ws').WebSocket>} */
    this.conns = new Set();
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    // Maps each raw WebSocket connection -> the set of real awareness
    // client IDs it has ever announced (cursor/name/color). This is what
    // lets us correctly remove ONLY that connection's presence data the
    // instant it disconnects — see closeConnection below.
    /** @type {Map<import('ws').WebSocket, Set<number>>} */
    this._connControlledIds = new Map();

    // Tracks the chain of in-progress saves for this room. Chained (not
    // just "the latest save") so saves complete in order, and so we have
    // one promise that means "everything saved so far has truly landed."
    // closeConnection awaits this before freeing the room from memory —
    // without that wait, a fast refresh could close the room and trigger
    // a fresh reload from MongoDB BEFORE the most recent edit's save had
    // actually finished writing, silently losing that edit. (This is a
    // real bug that was caught by testing rapid refresh-after-draw.)
    this._pendingSave = Promise.resolve();
    this._lastHistorySnapshotAt = 0;
    this._historyDirtySinceSnapshot = false;

    this.awareness.on("update", ({ added, updated, removed }, origin) => {
      const changedClients = added.concat(updated, removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients),
      );
      const message = encoding.toUint8Array(encoder);
      this.conns.forEach((conn) => send(conn, message));

      // `origin` is the connection that sent this awareness update (see
      // the MESSAGE_AWARENESS case in setupWSConnection, which passes
      // `conn` as the origin). Record which real client IDs belong to it.
      if (origin && this.conns.has(origin)) {
        let ids = this._connControlledIds.get(origin);
        if (!ids) {
          ids = new Set();
          this._connControlledIds.set(origin, ids);
        }
        added.concat(updated).forEach((id) => ids.add(id));
        removed.forEach((id) => ids.delete(id));
      }
    });

    this.on("update", (update, origin) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);
      this.conns.forEach((conn) => send(conn, message));

      if (origin !== "persistence-load") {
        this._pendingSave = this._pendingSave
          .then(() => saveRoomUpdate(this.name, update))
          .catch(() => {});

        // Just mark dirty here — DO NOT decide whether to snapshot from
        // inside this event handler. That was the bug: piggybacking the
        // snapshot check on Yjs's own update event meant a room that
        // went quiet for a while wouldn't get a new snapshot until
        // WHENEVER the next edit happened to occur — sometimes minutes
        // later — instead of a predictable ~30s cadence. A real
        // interval timer (below) checks independently of activity.
        this._historyDirtySinceSnapshot = true;
      }
    });

    // Real, independent timer — NOT triggered by Yjs events. This is
    // what actually guarantees a predictable snapshot cadence.
    this._historyInterval = setInterval(() => {
      takeHistorySnapshotIfDirty(this);
    }, HISTORY_SNAPSHOT_INTERVAL_MS);
  }
}

function takeHistorySnapshotIfDirty(doc) {
  if (!doc._historyDirtySinceSnapshot) return Promise.resolve();
  doc._lastHistorySnapshotAt = Date.now();
  doc._historyDirtySinceSnapshot = false;
  const snapshot = Y.encodeStateAsUpdate(doc);
  return saveHistorySnapshot(doc.name, snapshot).catch((err) => {
    console.warn(
      `[rooms] failed to save history snapshot for "${doc.name}": ${err.message}`,
    );
  });
}

function send(conn, message) {
  if (conn.readyState !== conn.OPEN) return;
  try {
    conn.send(message, (err) => {
      if (err) closeConnection(conn);
    });
  } catch (e) {
    closeConnection(conn);
  }
}

function getRoom(docName) {
  let doc = rooms.get(docName);
  if (!doc) {
    doc = new WSSharedDoc(docName);
    rooms.set(docName, doc);
    console.log(`[rooms] created room "${docName}"`);

    // Load any previously saved state before anyone starts editing.
    // Connections wait on this (see setupWSConnection) so nobody syncs
    // against a half-loaded doc.
    doc.readyPromise = loadRoomUpdate(docName)
      .then((update) => {
        if (update) {
          Y.applyUpdate(doc, update, "persistence-load");
          console.log(`[rooms] restored persisted state for room "${docName}"`);
        }
      })
      .catch((err) => {
        console.warn(
          `[rooms] error loading persisted state for "${docName}": ${err.message}`,
        );
      });
  }
  return doc;
}

async function closeConnection(conn) {
  const doc = conn.doc;
  if (doc) {
    doc.conns.delete(conn);

    // Remove exactly the presence entries THIS connection actually
    // announced — not a made-up ID. This is what makes a disconnected
    // user's cursor and name disappear immediately, instead of only
    // after Yjs's own ~30s stale-state fallback eventually clears it.
    const controlledIds = doc._connControlledIds.get(conn);
    if (controlledIds && controlledIds.size > 0) {
      awarenessProtocol.removeAwarenessStates(
        doc.awareness,
        Array.from(controlledIds),
        null,
      );
    }
    doc._connControlledIds.delete(conn);
    if (doc.conns.size === 0) {
      // Wait for every save triggered during this room's lifetime to
      // actually finish before freeing it from memory. This is the fix
      // for the race where a fast refresh could empty + reload a room
      // before its most recent edit had actually finished saving.
      await doc._pendingSave;

      // Someone may have reconnected while we were waiting — only
      // delete if the room is still actually empty.
      if (doc.conns.size === 0) {
        rooms.delete(doc.name);
        clearInterval(doc._historyInterval);
        console.log(`[rooms] room "${doc.name}" emptied, removed from memory`);
        flushRoom(doc.name);
      }
    }
  }
  try {
    conn.close();
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
export async function setupWSConnection(conn, docName) {
  conn.binaryType = "arraybuffer";
  const doc = getRoom(docName);
  conn.doc = doc;
  doc.conns.add(conn);

  conn.on("message", (message) => {
    const data = new Uint8Array(message);
    const decoder = decoding.createDecoder(data);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case MESSAGE_SYNC: {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
        // readSyncMessage may have queued a reply (e.g. step2 of the
        // handshake) — only send it if there's actual content beyond
        // the message-type header.
        if (encoding.length(encoder) > 1) {
          send(conn, encoding.toUint8Array(encoder));
        }
        break;
      }
      case MESSAGE_AWARENESS: {
        awarenessProtocol.applyAwarenessUpdate(
          doc.awareness,
          decoding.readVarUint8Array(decoder),
          conn,
        );
        break;
      }
      default:
        console.warn("[rooms] unknown message type", messageType);
    }
  });

  conn.on("close", () => {
    closeConnection(conn).catch((err) =>
      console.error(`[rooms] error during cleanup for "${docName}":`, err),
    );
  });
  conn.on("error", () => {
    closeConnection(conn).catch((err) =>
      console.error(`[rooms] error during cleanup for "${docName}":`, err),
    );
  });
  // Wait for any persisted state to finish loading before starting the
  // sync handshake — otherwise a client connecting at the exact moment
  // the room is first created could sync against a doc that hasn't
  // finished being restored from MongoDB yet.
  await doc.readyPromise;

  // Kick off the sync handshake: tell the new client what we have.
  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(conn, encoding.toUint8Array(encoder));

    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size > 0) {
      const awEncoder = encoding.createEncoder();
      encoding.writeVarUint(awEncoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        awEncoder,
        awarenessProtocol.encodeAwarenessUpdate(
          doc.awareness,
          Array.from(awarenessStates.keys()),
        ),
      );
      send(conn, encoding.toUint8Array(awEncoder));
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

/**
 * Force an immediate history snapshot for a room, if it's currently
 * active in memory and has unsaved changes. Called when someone opens
 * the History view, so "the latest point" always reflects genuinely
 * current state instead of waiting for the next timer tick.
 */

export async function forceHistorySnapshotIfActive(docName) {
  const doc = rooms.get(docName)
  if (doc) {
    await takeHistorySnapshotIfDirty(doc)
  }
}

/**
 * Force-close a room that's currently active in memory (used when the
 * owner deletes it). Disconnects everyone with a specific close reason
 * so their client isn't left silently retrying a room that no longer
 * exists — a fresh reconnect attempt will correctly get a 404 from the
 * upgrade handler either way, but closing proactively is more honest
 * than waiting for that to eventually happen.
 */
export function forceCloseRoom(docName, reason = 'Room deleted') {
  const doc = rooms.get(docName)
  if (!doc) return

  doc.conns.forEach((conn) => {
    try {
      conn.close(4001, reason)
    } catch (e) {
      /* already closed */
    }
  })
  clearInterval(doc._historyInterval)
  rooms.delete(docName)
  console.log(`[rooms] room "${docName}" force-closed: ${reason}`)
}