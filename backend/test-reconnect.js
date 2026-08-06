import { spawn } from 'child_process'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const PORT = 4112
const ROOM = 'reconnect-test-' + Date.now()

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
      // not up yet
    }
    await wait(100)
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`)
}

async function waitForWsConnected(provider, label, timeoutMs = 8000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (provider.wsconnected) return
    await wait(100)
  }
  throw new Error(`${label} never reported wsconnected=true within ${timeoutMs}ms`)
}

async function setupAuthAndRoom(port, roomId) {
  const username = `reconnecttest_${Date.now()}`
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
  const JWT_SECRET = 'test-secret-for-reconnect-test-only'
  const server = spawn('node', ['src/server.js'], {
    env: { ...process.env, PORT: String(PORT), JWT_SECRET },
    stdio: 'pipe',
  })
  server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`))
  server.stderr.on('data', (d) => process.stderr.write(`[server:err] ${d}`))

  await waitForServerReady(PORT)

  // The server now requires a valid token + PIN for every WebSocket
  // connection (see server.js's upgrade handler) - without this, the
  // connection is rejected before any sync logic even runs.
  const { token, pin } = await setupAuthAndRoom(PORT, ROOM)

  const docA = new Y.Doc()
  const docB = new Y.Doc()

  const providerA = new WebsocketProvider(`ws://localhost:${PORT}`, ROOM, docA, {
    WebSocketPolyfill: WebSocket,
    disableBc: true,
    params: { token, pin },
  })
  const providerB = new WebsocketProvider(`ws://localhost:${PORT}`, ROOM, docB, {
    WebSocketPolyfill: WebSocket,
    disableBc: true,
    params: { token, pin },
  })

  await waitForWsConnected(providerA, 'providerA')
  await waitForWsConnected(providerB, 'providerB')
  await wait(500)

  let pass = true

  // --- Simulate A going offline (WiFi drop, tab backgrounded, etc.) ---
  console.log('[test] disconnecting client A (simulating a dropped connection)...')
  providerA.disconnect()
  await wait(300)

  // While A is offline, BOTH clients make edits - this is the realistic
  // scenario: the disconnected user keeps working locally (Yjs is
  // offline-first, local edits always apply instantly), while everyone
  // still connected keeps working too.
  const textA = docA.getText('code')
  const textB = docB.getText('code')

  textA.insert(0, 'EDITED_WHILE_OFFLINE')
  const offlineEditApplied = textA.toString() === 'EDITED_WHILE_OFFLINE'
  console.log(
    `[test 1] Offline edit applies locally and instantly: ${offlineEditApplied ? 'PASS' : 'FAIL'}`
  )
  if (!offlineEditApplied) pass = false

  textB.insert(0, 'EDITED_WHILE_A_WAS_GONE')
  await wait(300)

  // Confirm A's edit did NOT reach B while disconnected (sanity check
  // that we're actually testing offline behavior, not accidentally
  // still connected).
  const bUnaffectedWhileAOffline = !textB.toString().includes('EDITED_WHILE_OFFLINE')
  console.log(
    `[test 2] B does NOT see A's edit while A is offline (confirms real disconnect): ${
      bUnaffectedWhileAOffline ? 'PASS' : 'FAIL'
    }`
  )
  if (!bUnaffectedWhileAOffline) pass = false

  // --- Reconnect A ---
  console.log('[test] reconnecting client A...')
  providerA.connect()
  await waitForWsConnected(providerA, 'providerA (reconnect)')
  await wait(1000) // let sync settle both directions

  const finalA = textA.toString()
  const finalB = textB.toString()

  const bothEditsSurvived =
    finalA === finalB &&
    finalA.includes('EDITED_WHILE_OFFLINE') &&
    finalA.includes('EDITED_WHILE_A_WAS_GONE')

  console.log(
    `[test 3] Both offline and online edits merge correctly after reconnect: ${
      bothEditsSurvived ? 'PASS' : 'FAIL'
    }`
  )
  console.log(`    docA sees: "${finalA}"`)
  console.log(`    docB sees: "${finalB}"`)
  if (!bothEditsSurvived) pass = false

  providerA.destroy()
  providerB.destroy()
  server.kill()

  console.log(pass ? '\nALL TESTS PASSED' : '\nSOME TESTS FAILED')
  process.exit(pass ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})