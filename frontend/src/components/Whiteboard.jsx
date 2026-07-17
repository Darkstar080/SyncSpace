import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Stage, Layer, Line, Rect, Text, Circle, Label, Tag, Transformer } from 'react-konva'
import * as Y from 'yjs'

const TOOLS = ['select', 'pen', 'rect', 'text']

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
 * SELECTION is the one exception: which shape is "selected" is a
 * purely local, per-user UI concept (my selection shouldn't highlight
 * on your screen), so it correctly lives in local React state
 * (`selectedId` below) — NOT in the Y.Doc. Everything about the shape
 * ITSELF (position, size, points, text) still only ever lives in the
 * Y.Map. If you add a new feature, ask: "is this shared data, or just
 * my own UI state?" before deciding where it goes.
 *
 * UNDO: scoped to the `shapes` type via Y.UndoManager. By default it
 * only tracks LOCAL edits (not ones that arrived over the network from
 * someone else) — so Ctrl+Z undoes your last action, never a
 * teammate's. That's Yjs's default behavior, not something we had to
 * build by hand.
 */
export default function Whiteboard({ shapes, awareness }) {
  const [, forceRender] = useReducer((x) => x + 1, 0)
  const [tool, setTool] = useState('select')
  const [selectedId, setSelectedId] = useState(null)
  const drawingShapeId = useRef(null)
  const startPoint = useRef(null)
  const stageRef = useRef(null)
  const shapeNodeRefs = useRef({}) // id -> Konva node, so the Transformer can attach
  const transformerRef = useRef(null)

  // One UndoManager per room, scoped to the shapes array only. (Code
  // editor undo is handled separately, by Monaco itself.)
  const undoManager = useMemo(() => new Y.UndoManager(shapes), [shapes])

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

  // Keep the Transformer attached to the selected shape — but ONLY if it's
  // a rect. Lines and text can be selected and moved, but have no
  // onTransformEnd handler to persist a resize, so attaching the
  // Transformer to them would let the user drag a resize handle that
  // silently does nothing useful (and can leave a stale visual scale on
  // the node until the next re-render). Restricting to 'rect' here keeps
  // the code honest about what it actually supports.
  useEffect(() => {
    const map = selectedId ? getShapeMapById(selectedId) : null
    const node = selectedId && map?.get('type') === 'rect'
      ? shapeNodeRefs.current[selectedId]
      : null
    if (transformerRef.current) {
      transformerRef.current.nodes(node ? [node] : [])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [selectedId, shapes])

  // Keyboard shortcuts: Delete/Backspace to remove selection, Ctrl+Z /
  // Ctrl+Y (or Ctrl+Shift+Z) for undo/redo. Guarded so typing in the
  // code editor (a <textarea> under the hood) never triggers these.
  useEffect(() => {
    function onKeyDown(e) {
      const activeTag = document.activeElement?.tagName
      const isTypingElsewhere = activeTag === 'TEXTAREA' || activeTag === 'INPUT'
      if (isTypingElsewhere) return

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        deleteShape(selectedId)
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) undoManager.redo()
        else undoManager.undo()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        undoManager.redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, undoManager])

  function getShapeMapById(id) {
    for (const item of shapes) {
      if (item.get('id') === id) return item
    }
    return null
  }

  function getShapeIndexById(id) {
    for (let i = 0; i < shapes.length; i++) {
      if (shapes.get(i).get('id') === id) return i
    }
    return -1
  }

  function deleteShape(id) {
    const index = getShapeIndexById(id)
    if (index === -1) return
    shapes.delete(index, 1)
    setSelectedId(null)
  }

  function pointerPos() {
    const stage = stageRef.current
    return stage.getPointerPosition()
  }

  function handleStageMouseDown(e) {
    // Clicked empty canvas background -> clear selection.
    if (e.target === stageRef.current) {
      setSelectedId(null)
    }

    if (tool === 'select') return // drawing tools only, below

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

  function handleStageMouseMove() {
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

  function handleStageMouseUp() {
    drawingShapeId.current = null
    startPoint.current = null
  }

  // --- Move (drag) a shape: write the new position back into its Y.Map ---
  function handleShapeDragEnd(id, e) {
    const map = getShapeMapById(id)
    if (!map) return
    const node = e.target
    const type = map.get('type')

    if (type === 'line') {
      // Lines are stored as a flat [x1,y1,x2,y2,...] list. Dragging the
      // whole line means shifting every point by however far it moved,
      // then resetting the node's own x/y back to 0 so we don't
      // double-apply the offset next render.
      const dx = node.x()
      const dy = node.y()
      const oldPoints = map.get('points')
      const newPoints = oldPoints.map((v, i) => (i % 2 === 0 ? v + dx : v + dy))
      map.set('points', newPoints)
      node.position({ x: 0, y: 0 })
    } else {
      map.set('x', node.x())
      map.set('y', node.y())
    }
  }

  // --- Resize a rectangle via the Transformer handles ---
  function handleRectTransformEnd(id, e) {
    const map = getShapeMapById(id)
    if (!map) return
    const node = e.target
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()

    // Konva's Transformer resizes by scaling, not by changing width/height
    // directly. Convert that scale into real width/height, then reset
    // scale to 1 so it doesn't compound on the next resize.
    map.set('x', node.x())
    map.set('y', node.y())
    map.set('width', Math.max(5, node.width() * scaleX))
    map.set('height', Math.max(5, node.height() * scaleY))
    node.scaleX(1)
    node.scaleY(1)
  }

  const otherUsers = Array.from(awareness.getStates().entries()).filter(
    ([clientId]) => clientId !== awareness.clientID
  )

  const selectable = tool === 'select'

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
          <button className="tool-btn" onClick={() => undoManager.undo()} title="Ctrl+Z">
            undo
          </button>
          <button className="tool-btn" onClick={() => undoManager.redo()} title="Ctrl+Shift+Z">
            redo
          </button>
          {selectedId && (
            <button className="tool-btn danger" onClick={() => deleteShape(selectedId)}>
              delete
            </button>
          )}
        </div>
      </div>
      <div className="canvas-wrap">
        <Stage
          ref={stageRef}
          width={640}
          height={520}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          className="konva-stage"
        >
          <Layer>
            {Array.from(shapes).map((map) => {
              const type = map.get('type')
              const id = map.get('id')
              const color = map.get('color') || '#111'
              const isSelected = id === selectedId

              const commonProps = {
                key: id,
                ref: (node) => {
                  if (node) shapeNodeRefs.current[id] = node
                  else delete shapeNodeRefs.current[id]
                },
                draggable: selectable,
                onClick: () => selectable && setSelectedId(id),
                onTap: () => selectable && setSelectedId(id),
                onDragEnd: (e) => handleShapeDragEnd(id, e),
              }

              if (type === 'line') {
                return (
                  <Line
                    {...commonProps}
                    points={map.get('points') || []}
                    stroke={isSelected ? '#89b4fa' : color}
                    strokeWidth={isSelected ? 3.5 : 2.5}
                    tension={0}
                    lineCap="round"
                    lineJoin="round"
                  />
                )
              }
              if (type === 'rect') {
                return (
                  <Rect
                    {...commonProps}
                    x={map.get('x')}
                    y={map.get('y')}
                    width={map.get('width')}
                    height={map.get('height')}
                    stroke={isSelected ? '#89b4fa' : color}
                    strokeWidth={isSelected ? 3 : 2}
                    onTransformEnd={(e) => handleRectTransformEnd(id, e)}
                  />
                )
              }
              if (type === 'text') {
                return (
                  <Text
                    {...commonProps}
                    x={map.get('x')}
                    y={map.get('y')}
                    text={map.get('text')}
                    fill={isSelected ? '#89b4fa' : color}
                    fontSize={16}
                  />
                )
              }
              return null
            })}

            {/* Resize handles for the selected rectangle only — lines/text
                can be moved but not resized in this pass (documented
                limitation, not an oversight: see README). */}
            <Transformer
              ref={transformerRef}
              rotateEnabled={false}
              flipEnabled={false}
              boundBoxFunc={(oldBox, newBox) =>
                newBox.width < 5 || newBox.height < 5 ? oldBox : newBox
              }
            />

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