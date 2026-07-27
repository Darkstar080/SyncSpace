import { spawn } from 'child_process'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const PORT = 4111
const ROOM = 'test-room-' + Date.now()

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForServerReady(port, timeoutMs = 10000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}/health`)
      if (res.ok) return
    } catch {
      // not up yet, keep polling
    }
    await wait(100)
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`)
}

async function setupAuthAndRoom(port, roomId) {
  const username = `synctest_${Date.now()}`
  const password = 'testpass123'

  const registerRes = await fetch(`http://localhost:${port}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const { token } = await registerRes.json()
  if (!token) throw new Error('Failed to register test user - no token returned')

  const roomRes = await fetch(`http://localhost:${port}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ roomId }),
  })
  const { pin } = await roomRes.json()
  if (!pin) throw new Error('Failed to create test room - no pin returned')

  return { token, pin }
}

async function main() {
  const JWT_SECRET = 'test-secret-for-sync-test-only'
  const server = spawn('node', ['src/server.js'], {
    env: { ...process.env, PORT: String(PORT), JWT_SECRET },
    stdio: 'pipe',
  })
  server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`))
  server.stderr.on('data', (d) => process.stderr.write(`[server:err] ${d}`))

  // IMPORTANT: don't guess a fixed delay here. Startup time varies
  // (e.g. it depends on how long the MongoDB connectivity check takes),
  // and connecting too early silently produces false-positive test
  // results via y-websocket's BroadcastChannel fallback (see disableBc
  // below) rather than a clear connection failure.
  await waitForServerReady(PORT)

  // The server now requires a valid token + PIN for every WebSocket
  // connection (see server.js's upgrade handler) - without this, every
  // connection attempt below would be rejected before any sync logic
  // even runs.
  const { token, pin } = await setupAuthAndRoom(PORT, ROOM)

  const docA = new Y.Doc()
  const docB = new Y.Doc()

  const providerA = new WebsocketProvider(
    `ws://localhost:${PORT}`,
    ROOM,
    docA,
    { WebSocketPolyfill: WebSocket, disableBc: true, params: { token, pin } }
  )
  const providerB = new WebsocketProvider(
    `ws://localhost:${PORT}`,
    ROOM,
    docB,
    { WebSocketPolyfill: WebSocket, disableBc: true, params: { token, pin } }
  )

  // Wait for both to actually report a real WebSocket connection, not
  // just assume a fixed delay was enough.
  async function waitForWsConnected(provider, label, timeoutMs = 8000) {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      if (provider.wsconnected) return
      await wait(100)
    }
    throw new Error(`${label} never reported wsconnected=true within ${timeoutMs}ms`)
  }
  await waitForWsConnected(providerA, 'providerA')
  await waitForWsConnected(providerB, 'providerB')

  await wait(500) // let the initial sync handshake settle

  let pass = true

  // --- Test 1: basic propagation ---
  const arrA = docA.getArray('shapes')
  arrA.push([{ id: 'shape-1', type: 'rect', x: 10, y: 20 }])

  await wait(500)

  const arrB = docB.getArray('shapes')
  const gotShape = arrB.length === 1 && arrB.get(0).id === 'shape-1'
  console.log(
    `[test 1] Draw in client A appears in client B: ${gotShape ? 'PASS' : 'FAIL'}`
  )
  if (!gotShape) pass = false

  // --- Test 2: simultaneous edits to the SAME shared text merge, not overwrite ---
  const textA = docA.getText('code')
  const textB = docB.getText('code')

  // Both start from the same empty state, then insert at the same
  // position "simultaneously" (no round trip in between).
  textA.insert(0, 'AAA')
  textB.insert(0, 'BBB')

  await wait(800) // let sync settle

  const finalA = textA.toString()
  const finalB = textB.toString()
  const merged = finalA === finalB && finalA.includes('AAA') && finalA.includes('BBB')
  console.log(`[test 2] Concurrent edits merge (no data loss): ${merged ? 'PASS' : 'FAIL'}`)
  console.log(`    docA sees: "${finalA}"`)
  console.log(`    docB sees: "${finalB}"`)
  if (!merged) pass = false

  // --- Test 3: disconnecting a user removes their presence PROMPTLY ---
  // (regression test for the bug where a leftover made-up per-connection
  // ID meant the server's disconnect cleanup never matched the real
  // awareness client ID, so a disconnected user's cursor/name only
  // disappeared once Yjs's own ~30s staleness fallback kicked in)
  providerA.awareness.setLocalStateField('user', { name: 'Alice', color: '#ff0000' })
  providerB.awareness.setLocalStateField('user', { name: 'Bob', color: '#00ff00' })
  await wait(500) // let awareness states propagate

  const clientAId = docA.clientID
  const seenBeforeDisconnect = providerB.awareness.getStates().has(clientAId)

  providerA.destroy() // simulates closing the tab / losing connection

  await wait(1500) // generous window — should be near-instant if fixed;
                    // the old bug would still show the stale state here
  const seenAfterDisconnect = providerB.awareness.getStates().has(clientAId)

  const presenceRemovedPromptly = seenBeforeDisconnect && !seenAfterDisconnect
  console.log(
    `[test 3] Disconnected user's presence removed promptly: ${presenceRemovedPromptly ? 'PASS' : 'FAIL'}`
  )
  console.log(`    seen before disconnect: ${seenBeforeDisconnect}, still seen 1.5s after: ${seenAfterDisconnect}`)
  if (!presenceRemovedPromptly) pass = false

  providerB.destroy()
  server.kill()

  console.log(pass ? '\nALL TESTS PASSED' : '\nSOME TESTS FAILED')
  process.exit(pass ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})