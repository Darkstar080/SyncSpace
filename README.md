# SyncSpace — Week 1 Scaffold (+ head start on Week 2 core sync)

## What's actually built right now

**Backend** (`/backend`)
- Express + raw WebSocket server
- Room-based Yjs sync engine (`src/rooms.js`) — one `Y.Doc` per room, broadcasting
  updates + awareness (cursors) to every connected client
- **Verified, not assumed**: `npm test` spins up the real server and two real
  client connections and proves (a) a drawn shape propagates from one client
  to another, and (b) two simultaneous edits to the same text merge instead
  of overwriting each other. That second test is the actual point of this
  whole project — if it ever starts failing, something is wrong at the
  foundation, stop and fix it before building on top.

**Frontend** (`/frontend`)
- React (Vite) app, split-screen layout
- Room join screen (name + room ID)
- Whiteboard: Konva canvas fully driven by the shared Yjs `shapes` array —
  pen, rectangle, and text tools, plus live cursors from other users
  (Awareness API)
- Code editor: Monaco bound to a shared `Y.Text` via `y-monaco` — typing
  syncs in real time, including simultaneous edits on the same line
- Connection status + live presence chips in the top bar

## What's NOT built yet (by design — later weeks per the plan)

- **Persistence** (Week 3): if the server restarts, in-memory rooms are lost.
  `rooms.js` has a comment marking exactly where a Mongo-backed persistence
  hook goes.
- **Auth / room access control** (Week 4)
- **Replay / history scrubbing** (Week 4 — confirm scope with your mentor
  early, don't leave this to the last days)
- Canvas polish: no shape selection/move/delete yet, no undo — only
  drawing new shapes

## A gotcha worth knowing about (so nobody rediscovers it the hard way)

The npm package `y-websocket` (v3+) only ships the **browser client**
(`WebsocketProvider`). It does **not** include a server-side helper anymore
— older tutorials referencing `y-websocket/bin/utils` won't work against
this version. That's why `backend/src/rooms.js` implements the server side
directly on `y-protocols` (the lower-level building block Yjs itself uses).
If you search for other tutorials, be aware some assume the old bundled
server and will lead you down a dead end.

## The shared data contract

Read `frontend/src/lib/yjs.js` before adding any new collaborative feature.
It defines the shape schema and the Yjs shared types everyone's code reads
from. This is the "API contract" file — changes to it should be coordinated
with the team, not made independently by whoever's touching a given module
that day.

## Running it locally

**Backend**
```
cd backend
npm install
npm run dev        # starts on http://localhost:4000
npm test           # runs the sync integration test described above
```

**Frontend**
```
cd frontend
npm install
cp .env.example .env    # points at ws://localhost:4000 by default
npm run dev             # starts on http://localhost:5173 (Vite default)
```

## How to actually test real-time sync yourself

1. Start the backend (`npm run dev` in `/backend`)
2. Start the frontend (`npm run dev` in `/frontend`)
3. Open `http://localhost:5173` in two browser tabs (or two different browsers)
4. Join the **same Room ID** with two different names
5. Draw on the whiteboard in one tab — it should appear in the other almost instantly
6. Type in the code editor in both tabs on the same line at the same time —
   confirm both ends up with both people's text, not one overwriting the other
7. Move your mouse over the whiteboard — the other tab should show your
   cursor with your name

## Known rough edges to fix before the mid-project review

- Bundle size warning on frontend build (~3MB, mostly Monaco) — fine for
  local dev, but code-splitting Monaco is worth doing before a polished demo
- No reconnect/error UI yet if the WebSocket drops
- Awareness cursor state doesn't clean up instantly if a tab is closed
  ungracefully (relies on WebSocket close detection, which has a small delay)
