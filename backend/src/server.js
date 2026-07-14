import express from 'express'
import cors from 'cors'
import http from 'http'
import { WebSocketServer } from 'ws'
import { setupWSConnection, getRoomStats } from './rooms.js'

const PORT = process.env.PORT || 4000

const app = express()
app.use(cors())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

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
    setupWSConnection(ws, docName)
  })
})

server.listen(PORT, () => {
  console.log(`SyncSpace backend listening on http://localhost:${PORT}`)
  console.log(`WebSocket rooms available at ws://localhost:${PORT}/<roomName>`)
})
