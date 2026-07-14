import { useEffect, useReducer, useRef, useState } from 'react'
import { Stage, Layer, Line, Rect, Text, Circle, Label, Tag } from 'react-konva'
import * as Y from 'yjs'

const TOOLS = ['pen', 'rect', 'text']

/**
 * IMPORTANT PATTERN — read this before touching this file:
 *
 * Konva never holds its own "source of truth" state for shapes. Every
 * shape drawn is written into `shapes` (a Y.Array of Y.Map, see
 * lib/yjs.js). The canvas only ever RENDERS what's currently in that
 * Y.Array. This is what makes concurrent drawing merge correctly
 * instead of overwriting: two users' shapes are two independent
 * entries in the same array, not two copies of local component state
 * fighting over one variable.
 *
 * If you add a new drawing feature, make sure it follows the same
 * shape: (1) write to the Y.Map/Y.Array, (2) let the observer below
 * re-render from the doc. Do not introduce a parallel `useState` that
 * holds shape data — that's the bug this whole architecture exists to
 * avoid.
 */
export default function Whiteboard({ shapes, awareness }) {
  const [, forceRender] = useReducer((x) => x + 1, 0)
  const [tool, setTool] = useState('pen')
  const drawingShapeId = useRef(null)
  const startPoint = useRef(null)
  const stageRef = useRef(null)

  // Re-render whenever the shared shapes array (or any nested field
  // inside a shape's Y.Map) changes — including changes made by
  // OTHER clients over the network.
  useEffect(() => {
    const rerender = () => forceRender()
    shapes.observeDeep(rerender)
    return () => shapes.unobserveDeep(rerender)
  }, [shapes])

  // Re-render on awareness changes (other users' cursors moving).
  useEffect(() => {
    const rerender = () => forceRender()
    awareness.on('change', rerender)
    return () => awareness.off('change', rerender)
  }, [awareness])

  function getShapeMapById(id) {
    for (const item of shapes) {
      if (item.get('id') === id) return item
    }
    return null
  }

  function pointerPos() {
    const stage = stageRef.current
    return stage.getPointerPosition()
  }

  function handleMouseDown() {
    const pos = pointerPos()
    if (tool === 'text') {
      const content = window.prompt('Text:')
      if (!content) return
      const map = new Y.Map()
      map.set('id', `${awareness.clientID}-${Date.now()}`)
      map.set('type', 'text')
      map.set('x', pos.x)
      map.set('y', pos.y)
      map.set('text', content)
      map.set('color', awareness.getLocalState()?.user?.color || '#000')
      shapes.push([map])
      return
    }

    const id = `${awareness.clientID}-${Date.now()}`
    const map = new Y.Map()
    map.set('id', id)
    map.set('color', awareness.getLocalState()?.user?.color || '#000')

    if (tool === 'pen') {
      map.set('type', 'line')
      map.set('points', [pos.x, pos.y])
    } else if (tool === 'rect') {
      map.set('type', 'rect')
      map.set('x', pos.x)
      map.set('y', pos.y)
      map.set('width', 0)
      map.set('height', 0)
    }

    shapes.push([map])
    drawingShapeId.current = id
    startPoint.current = pos
  }

  function handleMouseMove() {
    const pos = pointerPos()
    if (!pos) return

    // Broadcast cursor position to everyone else in the room.
    awareness.setLocalStateField('cursor', { x: pos.x, y: pos.y })

    if (!drawingShapeId.current) return
    const map = getShapeMapById(drawingShapeId.current)
    if (!map) return

    if (map.get('type') === 'line') {
      const points = map.get('points')
      map.set('points', [...points, pos.x, pos.y])
    } else if (map.get('type') === 'rect') {
      const start = startPoint.current
      map.set('width', pos.x - start.x)
      map.set('height', pos.y - start.y)
    }
  }

  function handleMouseUp() {
    drawingShapeId.current = null
    startPoint.current = null
  }

  const otherUsers = Array.from(awareness.getStates().entries()).filter(
    ([clientId]) => clientId !== awareness.clientID
  )

  return (
    <div className="panel whiteboard-panel">
      <div className="panel-header">
        <span>Whiteboard</span>
        <div className="tool-group">
          {TOOLS.map((t) => (
            <button
              key={t}
              className={`tool-btn ${tool === t ? 'active' : ''}`}
              onClick={() => setTool(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="canvas-wrap">
        <Stage
          ref={stageRef}
          width={640}
          height={520}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="konva-stage"
        >
          <Layer>
            {Array.from(shapes).map((map) => {
              const type = map.get('type')
              const id = map.get('id')
              const color = map.get('color') || '#111'

              if (type === 'line') {
                return (
                  <Line
                    key={id}
                    points={map.get('points') || []}
                    stroke={color}
                    strokeWidth={2.5}
                    tension={0}
                    lineCap="round"
                    lineJoin="round"
                  />
                )
              }
              if (type === 'rect') {
                return (
                  <Rect
                    key={id}
                    x={map.get('x')}
                    y={map.get('y')}
                    width={map.get('width')}
                    height={map.get('height')}
                    stroke={color}
                    strokeWidth={2}
                  />
                )
              }
              if (type === 'text') {
                return (
                  <Text
                    key={id}
                    x={map.get('x')}
                    y={map.get('y')}
                    text={map.get('text')}
                    fill={color}
                    fontSize={16}
                  />
                )
              }
              return null
            })}

            {/* Other users' live cursors, driven by Awareness (not the shapes array) */}
            {otherUsers.map(([clientId, state]) => {
              if (!state?.cursor) return null
              const { x, y } = state.cursor
              const name = state.user?.name || 'Guest'
              const color = state.user?.color || '#888'
              return (
                <Label key={clientId} x={x} y={y}>
                  <Tag fill={color} pointerDirection="left" />
                  <Text text={` ${name} `} fill="#fff" fontSize={12} padding={2} />
                </Label>
              )
            })}
            {otherUsers.map(([clientId, state]) =>
              state?.cursor ? (
                <Circle
                  key={`dot-${clientId}`}
                  x={state.cursor.x}
                  y={state.cursor.y}
                  radius={4}
                  fill={state.user?.color || '#888'}
                />
              ) : null
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  )
}
