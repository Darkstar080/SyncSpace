import express from 'express'
import cors from 'cors'
import http from 'http'
import { WebSocketServer } from 'ws'
import { setupWSConnection, getRoomStats } from './rooms.js'
import { initPersistence, isAvailable, closePersistence } from './persistence.js'
import runRoute from "./routes/run.js";

const PORT = process.env.PORT || 4000

const app = express()
app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    persistence: isAvailable() ? 'connected' : 'unavailable (in-memory only)',
  })
})
app.use("/run", runRoute);

// Handy while building the frontend: see which rooms are live and how
// many clients are in each, without opening browser dev tools.
app.get('/debug/rooms', (req, res) => {
  res.json(getRoomStats())
})

const server = http.createServer(app)
const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    // Room name = the URL path, e.g. ws://localhost:4000/interview-42
    // matches how the frontend's y-websocket WebsocketProvider is
    // configured (see frontend/src/lib/yjs.js).
    const url = new URL(request.url, `http://${request.headers.host}`)
    const docName = url.pathname.slice(1) || 'default-room'
    setupWSConnection(ws, docName).catch((err) => {
      console.error(`[server] error setting up connection for "${docName}":`, err)
    })
  })
})

async function start() {
  // Checked once, up front, so persistence availability is known and
  // logged before any real traffic arrives — see persistence.js for why
  // this matters (y-mongodb-provider itself connects lazily).
  await initPersistence()

  server.listen(PORT, () => {
    console.log(`SyncSpace backend listening on http://localhost:${PORT}`)
    console.log(`WebSocket rooms available at ws://localhost:${PORT}/<roomName>`)
  })
}

async function shutdown() {
  console.log('\n[server] shutting down...')
  await closePersistence()
  server.close(() => process.exit(0))
  // Force-exit if close() hangs (e.g. a socket won't close cleanly).
  setTimeout(() => process.exit(1), 3000).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

start()