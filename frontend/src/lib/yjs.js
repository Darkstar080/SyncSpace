/**
 * yjs.js — THE SHARED DATA CONTRACT
 *
 * Every module (canvas, code editor, cursors) reads/writes the SAME
 * Y.Doc through the shared types defined here. If you're adding a new
 * kind of collaborative data, add it here first and tell the team,
 * rather than inventing a new shared type inside your own component.
 *
 * Shared types on the doc:
 *   - doc.getArray('shapes')  -> whiteboard shapes (see SHAPE SCHEMA below)
 *   - doc.getText('code')     -> the Monaco editor's contents
 *   - provider.awareness      -> per-user ephemeral state (cursor, name, color)
 *
 * SHAPE SCHEMA (each entry in the 'shapes' Y.Array is a Y.Map with):
 *   id:     string   — unique id, e.g. `${clientID}-${counter}`
 *   type:   'line' | 'rect' | 'text'
 *   color:  string   — stroke/fill color
 *   -- for type 'line':
 *   points: number[] — flat [x1, y1, x2, y2, ...] Konva Line format
 *   -- for type 'rect':
 *   x, y, width, height: number
 *   -- for type 'text':
 *   x, y:   number
 *   text:   string
 *
 * AWARENESS SCHEMA (provider.awareness.getLocalState() / getStates()):
 *   user:   { name: string, color: string }
 *   cursor: { x: number, y: number } | null  — canvas-space coordinates
 */

import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000'

const USER_COLORS = [
  '#e63946', '#2a9d8f', '#e9c46a', '#264653',
  '#f4a261', '#8ab17d', '#6d597a', '#118ab2',
]

export function randomColor() {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]
}

/**
 * Create (or join) a room. Returns everything a component needs:
 * the raw doc, the provider (for connection status + awareness),
 * and direct handles to the shared types.
 *
 * @param {string} roomName
 * @param {{ name: string, color: string }} user
 */
export function createRoomConnection(roomName, user) {
  const doc = new Y.Doc()
  const provider = new WebsocketProvider(WS_URL, roomName, doc)

  provider.awareness.setLocalStateField('user', user)
  provider.awareness.setLocalStateField('cursor', null)

  return {
    doc,
    provider,
    awareness: provider.awareness,
    shapes: doc.getArray('shapes'),
    codeText: doc.getText('code'),
  }
}

export function destroyRoomConnection(connection) {
  if (!connection) return
  connection.provider.destroy()
  connection.doc.destroy()
}
