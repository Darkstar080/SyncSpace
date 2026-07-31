import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Line, Rect, Circle, Ellipse, Star, Text, Group, Arrow } from 'react-konva'
import Editor from '@monaco-editor/react'
import * as Y from 'yjs'
import { getRoomHistoryIndex, getRoomHistorySnapshot } from '../lib/api'

function base64ToBytes(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Read-only replay viewer: lets you scrub through periodic history
 * snapshots and see the whiteboard/code as they were at that point.
 *
 * SCOPE, stated plainly: this shows periodic checkpoints (see
 * HISTORY_SNAPSHOT_INTERVAL_MS in rooms.js), not a scrub-every-
 * keystroke timeline — a deliberate, disclosed limitation, not a bug.
 */
export default function ReplayModal({ roomId, pin, onClose }) {
  const [timestamps, setTimestamps] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shapes, setShapes] = useState([])
  const [code, setCode] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)

  const canvasWrapRef = useRef(null)
  const [stageSize, setStageSize] = useState({ width: 640, height: 480 })

  useEffect(() => {
    const el = canvasWrapRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setStageSize({ width: Math.max(width, 1), height: Math.max(height, 1) })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Load the list of available snapshot timestamps once.
  useEffect(() => {
    getRoomHistoryIndex(roomId, pin)
      .then((data) => {
        setTimestamps(data.timestamps)
        setSelectedIndex(Math.max(0, data.timestamps.length - 1)) // start at most recent
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [roomId, pin])

  // Fetch + reconstruct the snapshot whenever the selected index changes.
  useEffect(() => {
    if (timestamps.length === 0) return
    const timestamp = timestamps[selectedIndex]
    if (timestamp === undefined) return

    let cancelled = false
    getRoomHistorySnapshot(roomId, pin, timestamp)
      .then((data) => {
        if (cancelled) return
        const bytes = base64ToBytes(data.snapshot)
        const replayDoc = new Y.Doc()
        Y.applyUpdate(replayDoc, bytes)
        setShapes(Array.from(replayDoc.getArray('shapes')).map((m) => m.toJSON()))
        setCode(replayDoc.getText('code').toString())
      })
      .catch((err) => setError(err.message))

    return () => {
      cancelled = true
    }
  }, [timestamps, selectedIndex, roomId, pin])

  // Auto-advance ("play") through the timeline.
  useEffect(() => {
    if (!isPlaying) return
    if (selectedIndex >= timestamps.length - 1) {
      setIsPlaying(false)
      return
    }
    const t = setTimeout(() => setSelectedIndex((i) => i + 1), 900)
    return () => clearTimeout(t)
  }, [isPlaying, selectedIndex, timestamps.length])

  const currentTimestamp = timestamps[selectedIndex]

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
      <div className="bg-bg border border-border rounded-xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-bg-panel border-b border-border flex-shrink-0">
          <span className="font-medium text-text">Replay — {roomId}</span>
          <button
            onClick={onClose}
            className="text-xs text-text-dim underline cursor-pointer bg-transparent border-none"
          >
            Close
          </button>
        </div>

        {loading && <p className="p-4 text-sm text-text-dim">Loading history…</p>}
        {error && <p className="p-4 text-sm text-accent-2">{error}</p>}

        {!loading && !error && timestamps.length === 0 && (
          <p className="p-4 text-sm text-text-dim">
            No history snapshots yet for this room — check back after some activity.
          </p>
        )}

        {!loading && !error && timestamps.length > 0 && (
          <>
            <div className="flex-1 flex min-h-0">
              <div ref={canvasWrapRef} className="flex-1 min-h-0 bg-bg-deep border-r border-border">
                <Stage width={stageSize.width} height={stageSize.height} className="bg-white">
                  <Layer>
                    {shapes.map((s) => {
                      const common = {
                        key: s.id,
                        x: s.x || 0,
                        y: s.y || 0,
                        rotation: s.rotation || 0,
                        scaleX: s.scaleX || 1,
                        scaleY: s.scaleY || 1,
                      }
                      const color = s.color || '#111'

                      if (s.type === 'line' || s.type === 'straight_line' || s.type === 'arrow') {
                        const Comp = s.type === 'arrow' ? Arrow : Line
                        return (
                          <Comp
                            {...common}
                            points={s.points || []}
                            stroke={color}
                            strokeWidth={s.strokeWidth || 2}
                            opacity={(s.opacity ?? 100) / 100}
                            lineCap="round"
                            lineJoin="round"
                          />
                        )
                      }
                      if (['rect', 'circle', 'ellipse', 'triangle', 'diamond', 'star'].includes(s.type)) {
                        const w = s.width || 0
                        const h = s.height || 0
                        const absW = Math.abs(w)
                        const absH = Math.abs(h)
                        let inner = null
                        if (s.type === 'rect') inner = <Rect stroke={color} strokeWidth={2} width={w} height={h} />
                        else if (s.type === 'circle')
                          inner = <Circle stroke={color} strokeWidth={2} x={w / 2} y={h / 2} radius={Math.max(absW, absH) / 2} />
                        else if (s.type === 'ellipse')
                          inner = <Ellipse stroke={color} strokeWidth={2} x={w / 2} y={h / 2} radiusX={absW / 2} radiusY={absH / 2} />
                        else if (s.type === 'triangle')
                          inner = <Line stroke={color} strokeWidth={2} points={[w / 2, 0, w, h, 0, h]} closed />
                        else if (s.type === 'diamond')
                          inner = <Line stroke={color} strokeWidth={2} points={[w / 2, 0, w, h / 2, w / 2, h, 0, h / 2]} closed />
                        else if (s.type === 'star')
                          inner = (
                            <Star
                              stroke={color}
                              strokeWidth={2}
                              x={w / 2}
                              y={h / 2}
                              numPoints={5}
                              innerRadius={Math.max(absW, absH) / 4}
                              outerRadius={Math.max(absW, absH) / 2}
                            />
                          )
                        return <Group {...common}>{inner}</Group>
                      }
                      if (s.type === 'text') {
                        return (
                          <Text
                            {...common}
                            text={s.text}
                            fill={color}
                            fontSize={s.fontSize || 16}
                            fontFamily={s.fontFamily || 'Arial'}
                          />
                        )
                      }
                      return null
                    })}
                  </Layer>
                </Stage>
              </div>
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  language="python"
                  theme="vs-dark"
                  value={code}
                  options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13 }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 bg-bg-panel border-t border-border flex-shrink-0">
              <button
                onClick={() => setIsPlaying((p) => !p)}
                className="text-xs bg-accent text-bg-deep rounded px-3 py-1.5 cursor-pointer font-semibold"
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <input
                type="range"
                min={0}
                max={timestamps.length - 1}
                value={selectedIndex}
                onChange={(e) => {
                  setIsPlaying(false)
                  setSelectedIndex(Number(e.target.value))
                }}
                className="flex-1"
              />
              <span className="text-xs text-text-dim font-mono w-40 text-right">
                {currentTimestamp ? new Date(currentTimestamp).toLocaleString() : ''}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}