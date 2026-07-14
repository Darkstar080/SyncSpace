import { spawn } from 'child_process'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const PORT = 4111
const ROOM = 'test-room-' + Date.now()

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const server = spawn('node', ['src/server.js'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe',
  })
  server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`))
  server.stderr.on('data', (d) => process.stderr.write(`[server:err] ${d}`))

  await wait(800) // let it boot

  const docA = new Y.Doc()
  const docB = new Y.Doc()

  const providerA = new WebsocketProvider(
    `ws://localhost:${PORT}`,
    ROOM,
    docA,
    { WebSocketPolyfill: WebSocket }
  )
  const providerB = new WebsocketProvider(
    `ws://localhost:${PORT}`,
    ROOM,
    docB,
    { WebSocketPolyfill: WebSocket }
  )

  await wait(800) // let both connect + sync

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
