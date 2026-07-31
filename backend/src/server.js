import express from 'express'
import cors from 'cors'
import http from 'http'
import { WebSocketServer } from 'ws'
import { setupWSConnection, getRoomStats } from './rooms.js'
import { initPersistence, isAvailable, closePersistence } from './persistence.js'
import { connectDB, getDB, closeDB } from './db.js'
import { verifyToken } from './auth.js'
import authRoutes from './authRoutes.js'
import roomsApiRoutes from './roomsApi.js'
import runRoutes from "./routes/run.js";
import aiRoutes from "./routes/ai.js";

const PORT = process.env.PORT || 4000

const app = express()
app.use(cors())
app.use(express.json())
app.use('/run', runRoutes)


app.use('/auth', authRoutes)
app.use('/rooms', roomsApiRoutes)
app.use("/ai", aiRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    persistence: isAvailable() ? 'connected' : 'unavailable (in-memory only)',
  })
})

// Handy while building the frontend: see which rooms are live and how
// many clients are in each, without opening browser dev tools.
app.get('/debug/rooms', (req, res) => {
  res.json(getRoomStats())
})

const server = http.createServer(app)
const wss = new WebSocketServer({ noServer: true })

/**
 * Reject a WebSocket upgrade at the HTTP level, before the WS handshake
 * completes. This is the standard way to say "no" to a connection
 * attempt that never should have become a WebSocket in the first place.
 */
function rejectUpgrade(socket, statusCode, message) {
  socket.write(`HTTP/1.1 ${statusCode} ${message}\r\n\r\n`)
  socket.destroy()
}

server.on('upgrade', async (request, socket, head) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`)
    // IMPORTANT: url.pathname does NOT automatically decode percent-
    // encoding (e.g. "%20" stays as literal text, not a space). Room
    // names with spaces or other special characters would silently
    // fail to match what's stored in MongoDB without this decode —
    // this was a real bug, caught by testing a room name with a space
    // in it ("Our first room").
    const docName = decodeURIComponent(url.pathname.slice(1)) || 'default-room'
    const token = url.searchParams.get('token')
    const pin = url.searchParams.get('pin')

    if (!token) {
      return rejectUpgrade(socket, 401, 'Unauthorized - missing token')
    }

    let user
    try {
      user = verifyToken(token)
    } catch (err) {
      return rejectUpgrade(socket, 401, 'Unauthorized - invalid or expired token')
    }

    const db = getDB()
    const room = await db.collection('rooms').findOne({ _id: docName })
    if (!room) {
      return rejectUpgrade(socket, 404, 'Room not found')
    }
    if (room.pin !== pin) {
      return rejectUpgrade(socket, 403, 'Forbidden - incorrect PIN')
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.userId = user.userId
      ws.username = user.username
      setupWSConnection(ws, docName).catch((err) => {
        console.error(`[server] error setting up connection for "${docName}":`, err)
      })
    })
  } catch (err) {
    console.error('[server] error during upgrade:', err)
    rejectUpgrade(socket, 500, 'Internal Server Error')
  }
})

async function start() {
  // Auth/room data is a HARD dependency — if this fails, let it throw
  // and crash startup rather than run in a broken state where login is
  // silently impossible. (Contrast with initPersistence() below, which
  // is designed to fail gracefully — see persistence.js for why.)
  await connectDB()

  // Checked once, up front, so persistence availability is known and
  // logged before any real traffic arrives.
  await initPersistence()

  server.listen(PORT, () => {
    console.log(`SyncSpace backend listening on http://localhost:${PORT}`)
    console.log(`WebSocket rooms available at ws://localhost:${PORT}/<roomName>`)
  })
}

async function shutdown() {
  console.log('\n[server] shutting down...')
  await closePersistence()
  await closeDB()
  server.close(() => process.exit(0))
  // Force-exit if close() hangs (e.g. a socket won't close cleanly).
  setTimeout(() => process.exit(1), 3000).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

start().catch((err) => {
  console.error('[server] fatal startup error:', err)
  process.exit(1)
})