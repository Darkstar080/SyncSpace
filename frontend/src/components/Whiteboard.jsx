import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Stage, Layer, Line, Rect, Text, Circle, Label, Tag, Transformer } from 'react-konva'
import * as Y from 'yjs'
import PenPanel from "./PenPanel"
import MiniPenBar from "./MiniPenBar"

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
  const canvasWrapRef = useRef(null)
  const shapeNodeRefs = useRef({}) // id -> Konva node, so the Transformer can attach
  const transformerRef = useRef(null)
  const [stageSize, setStageSize] = useState({ width: 640, height: 520 })
  const [textBox, setTextBox] = useState(null)
  const [fontSize, setFontSize] = useState(16)
  const [fontFamily, setFontFamily] =useState("arial") 
  const [fontColor, setFontColor] = useState("#000000")
  const [showPenPanel, setShowPenPanel] = useState(false)
  const [showTextPanel, setShowTextPanel] = useState(false)
  const [showMiniPenBar, setShowMiniPenBar] = useState(false)
   const [minimized, setMinimized] = useState(false)
  const [penColor, setPenColor] = useState("#1e1e1e")
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [opacity, setOpacity] = useState(100)
  const [penType, setPenType] = useState("normal")
  const penPanelRef = useRef(null)
  const [penPanelPosition, setPenPanelPosition] = useState({
      x: 20,
      y: 70,
    })
  
 

  // Fill the whole panel instead of a fixed 640x520 box. Without this,
  // the canvas leaves dead space below/beside it whenever the window is
  // bigger than the hardcoded size — which is what was happening before.
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

 // Close the Pen Panel when clicking outside of it
  useEffect(() => {
    const rerender = () => forceRender()
    awareness.on('change', rerender)
    return () => awareness.off('change', rerender)
  }, [awareness])


  // Close Pen Panel when clicking outside of it
useEffect(() => {
  function handleMouseDown(e) {
    if (
      showPenPanel &&
      penPanelRef.current &&
      !penPanelRef.current.contains(e.target)
    ) {
      setShowPenPanel(false)
    }
  }

  document.addEventListener("mousedown", handleMouseDown)

  return () => {
    document.removeEventListener("mousedown", handleMouseDown)
  }
}, [showPenPanel])
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

  function updateSelectedText(property, value) {
    if (!selectedId) return

    const map = getShapeMapById(selectedId)
    if (!map) return

    if (map.get("type") !== "text") return

    map.set(property, value)
  }

  function pointerPos() {
    const stage = stageRef.current
    return stage.getPointerPosition()
  }

  function handleStageMouseDown(e) {
    if (showPenPanel) {
      setShowPenPanel(false)
      setShowMiniPenBar(true)
    }
    // Clicked empty canvas background -> clear selection.
    if (e.target === stageRef.current) {
      setSelectedId(null)
    }

    if (tool === 'select') return // drawing tools only, below

    const pos = pointerPos()
    if (tool === 'text') {
  setTextBox({
    x: pos.x,
    y: pos.y,
    width: 200,
    height: 80,
    text: "",
  })
  return
}

    const id = `${awareness.clientID}-${Date.now()}`
    const map = new Y.Map()
    map.set('id', id)
    map.set(
      "color",
      penType === "laser" ? "#ff2d2d" : penColor
    )
    map.set('strokeWidth', strokeWidth)
    map.set("opacity", opacity)
    map.set("penType", penType)
    map.set("createdAt", Date.now())

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
  // When the user releases the mouse button, if they were drawing a "laser" line, remove it after a short delay. This creates a temporary
  // highlight effect that disappears automatically.
    function handleStageMouseUp() {
      const id = drawingShapeId.current

      if (id) {
        const shape = getShapeMapById(id)

        if (shape && shape.get("penType") === "laser") {
          setTimeout(() => {
            const index = getShapeIndexById(id)

            if (index !== -1) {
              shapes.delete(index, 1)
            }
          }, 1000) // Change to 2000 for 2 seconds
        }
      }

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
    <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-border">
      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-panel border-b border-border text-sm text-text-dim flex-shrink-0">
        <span className="font-medium text-text">Whiteboard</span>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 bg-bg-deep rounded-lg p-1">
            {TOOLS.map((t) => (
              <button
                key={t}
                className={`px-2.5 py-1 rounded-md text-xs capitalize cursor-pointer transition-colors ${
                  tool === t
                    ? 'bg-accent text-bg-deep font-semibold'
                    : 'bg-transparent text-text-dim hover:text-text'
                }`}
                onClick={() => {
                  setTool(t)

                  if (t === "pen") {
                    setShowPenPanel(true)
                    setShowTextPanel(false)
                  } else if (t === "text") {
                    setShowPenPanel(false)
                    setShowTextPanel(true)
                  } else {
                    setShowPenPanel(false)
                    setShowTextPanel(false)
                  }                  
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {tool === "text" && (
  <div className="flex items-center gap-2">

    <select
      value={fontFamily}
      onChange={(e) => {
        setFontFamily(e.target.value)
        updateSelectedText("fontFamily", e.target.value)
      }}
    >
      <option value="Arial">Arial</option>
      <option value="Verdana">Verdana</option>
      <option value="Georgia">Georgia</option>
      <option value="Tahoma">Tahoma</option>
      <option value="Courier New">Courier New</option>
      <option value="Times New Roman">Times New Roman</option>
    </select>

    <input
      type="number"
      min="8"
      max="72"
      value={fontSize}
      onChange={(e) => {
        const value = Number(e.target.value)
        setFontSize(value)
        updateSelectedText("fontSize", value)
      }}
      style={{ width: "60px" }}
    />

    <input
      type="color"
      value={fontColor}
      onChange={(e) => {
        setFontColor(e.target.value)
        updateSelectedText("color", e.target.value)
      }}
    />

  </div>
)}
          <div className="w-px h-5 bg-border" />
          <button
            className="px-2.5 py-1 rounded-md text-xs bg-transparent text-text-dim border border-border hover:opacity-80"
            onClick={() => undoManager.undo()}
            title="Ctrl+Z"
          >
            undo
          </button>
          <button
            className="px-2.5 py-1 rounded-md text-xs bg-transparent text-text-dim border border-border hover:opacity-80"
            onClick={() => undoManager.redo()}
            title="Ctrl+Shift+Z"
          >
            redo
          </button>
          {selectedId && (
            <button
              className="px-2.5 py-1 rounded-md text-xs bg-transparent border border-accent-2 text-accent-2 hover:bg-accent-2 hover:text-bg-deep"
              onClick={() => deleteShape(selectedId)}
            >
              delete
            </button>
          )}
        </div>
      </div>
      <div
          ref={canvasWrapRef}
          className="flex-1 min-h-0 bg-bg-deep relative"
        >
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          className="bg-white"
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
                    strokeWidth={isSelected ? map.get("strokeWidth") + 1 : map.get("strokeWidth")}
                    opacity={(map.get("opacity") ?? 100) / 100}
                    tension={0}
                    lineCap="round"
                    lineJoin="round"
                    shadowColor={map.get("penType") === "laser" ? "#ff0000" : undefined}
                    shadowBlur={map.get("penType") === "laser" ? 12 : 0}
                    shadowOpacity={map.get("penType") === "laser" ? 1 : 0}
                    shadowEnabled={map.get("penType") === "laser"}

                    strokeWidth={
                      map.get("penType") === "laser"
                        ? map.get("strokeWidth") + 1
                        : (isSelected ? map.get("strokeWidth") + 1 : map.get("strokeWidth"))
                    }
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
                    stroke={
                          map.get("penType") === "laser"
                            ? "#ff0000"
                            : (isSelected ? "#89b4fa" : color)
                        }
                    strokeWidth={isSelected ? 3 : 2}
                    onTransformEnd={(e) => handleRectTransformEnd(id, e)}
                  />
                )
              }
              if (type === 'text') {
                return (
                  <Text
                    {...commonProps}
                    x={map.get("x")}
                    y={map.get("y")}
                    text={map.get("text")}
                    fill={isSelected ? "#89b4fa" : map.get("color")}
                    fontSize={map.get("fontSize") || 16}

                    fontFamily={map.get("fontFamily") || "Arial"}
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
        {showTextPanel && (
  <div
    style={{
      position: "absolute",
      left: 20,
      top: 70,
      width: 250,
      background: "#fff",
      borderRadius: "16px",
      padding: "18px",
      boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
      border: "1px solid #ddd",
      zIndex: 1000,
    }}
  >
    <h3 style={{ marginBottom: 15 }}>Text Settings</h3>

    <div style={{ marginBottom: 15 }}>
      <div style={{ marginBottom: 5 }}>Font Family</div>

      <select
        value={fontFamily}
        style={{
          width: "100%",
          padding: "8px",
          borderRadius: "8px",
        }}
        onChange={(e) => {
          setFontFamily(e.target.value)
          updateSelectedText("fontFamily", e.target.value)
        }}
      >
        <option value="Arial">Arial</option>
        <option value="Verdana">Verdana</option>
        <option value="Georgia">Georgia</option>
        <option value="Tahoma">Tahoma</option>
        <option value="Courier New">Courier New</option>
        <option value="Times New Roman">Times New Roman</option>
      </select>
    </div>

    <div style={{ marginBottom: 15 }}>
      <div style={{ marginBottom: 5 }}>Font Size</div>

      <input
        type="range"
        min="8"
        max="72"
        value={fontSize}
        style={{ width: "100%" }}
        onChange={(e) => {
          const value = Number(e.target.value)
          setFontSize(value)
          updateSelectedText("fontSize", value)
        }}
      />

      <div>{fontSize}px</div>
    </div>

    <div>
      <div style={{ marginBottom: 5 }}>Font Color</div>

      <input
        type="color"
        value={fontColor}
        style={{
          width: "100%",
          height: "40px",
          border: "none",
        }}
        onChange={(e) => {
          setFontColor(e.target.value)
          updateSelectedText("color", e.target.value)
        }}
      />
    </div>
  </div>
)}

          {showPenPanel && (
            <div ref={penPanelRef}>
              <PenPanel
                penColor={penColor}
                setPenColor={setPenColor}
                strokeWidth={strokeWidth}
                setStrokeWidth={setStrokeWidth}
                opacity={opacity}
                setOpacity={setOpacity}
                penType={penType}
                setPenType={setPenType}
                position={penPanelPosition}
                setPosition={setPenPanelPosition}
              />
            </div>
          )}
          {showMiniPenBar && (
            <MiniPenBar
                onExpand={() => {
                  setPenPanelPosition({
                    x: penPanelPosition.x,
                    y: penPanelPosition.y + 45,
                  })

                  setShowMiniPenBar(false)
                  setShowPenPanel(true)
                }}
              onClose={() => {
                setShowMiniPenBar(false)
              }}
              position={penPanelPosition}
              setPosition={setPenPanelPosition}
            />
          )}
        {textBox && (
              <textarea
             
                value={textBox.text}
                onChange={(e) =>
                  setTextBox({
                    ...textBox,
                    text: e.target.value,
                  })
                }
                onBlur={() => {
                      if (!textBox.text.trim()) {
                        setTextBox(null)
                        return
                      }

                      const map = new Y.Map()
                      map.set("id", `${awareness.clientID}-${Date.now()}`)
                      map.set("type", "text")
                      map.set("x", textBox.x)
                      map.set("y", textBox.y)
                      map.set("text", textBox.text)
                      map.set("fontSize", fontSize)
                      map.set("fontFamily", fontFamily)
                      map.set("color", fontColor)

                      shapes.push([map])

                      setTextBox(null)
                    }}
                style={{
                  position: "absolute",
                  left: textBox.x,
                  top: textBox.y,
                  width: textBox.width,
                  height: textBox.height,
                  resize: "both",
                  overflow: "hidden",
                  border: "1px solid #3b82f6",
                  outline: "none",
                  background: "transparent",
                  fontSize: "16px",
                  padding: "4px",
                }}
              />
            )}
      </div>
    </div>
  )
}