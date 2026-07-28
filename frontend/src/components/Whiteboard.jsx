import { forwardRef, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  Stage, Layer, Line, Rect, Text, Circle, Label, Tag, Transformer,
  Ellipse, Arrow, Star, Group, Image as KonvaImage
} from 'react-konva'
import * as Y from 'yjs'
import PenPanel from "./PenPanel"
import MiniPenBar from "./MiniPenBar"
import ShapePanel from "./ShapePanel"
import MiniShapeBar from "./MiniShapeBar"

const TOOLS = ['select', 'pen', 'eraser', 'delete', 'text']
const ImageShape = forwardRef(function ImageShape({ src, ...props }, ref) {
  const [image, setImage] = useState(null)

  useEffect(() => {
    const element = new window.Image()

    element.onload = () => {
      setImage(element)
    }

    element.src = src

    return () => {
      element.onload = null
    }
  }, [src])

  return <KonvaImage ref={ref} {...props} image={image} />
})

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
  const [background, setBackground] = useState("#ffffff")
  const drawingShapeId = useRef(null)
  const startPoint = useRef(null)
  const stageRef = useRef(null)
  const canvasWrapRef = useRef(null)
  const imageInputRef = useRef(null)
  const shapeNodeRefs = useRef({}) // id -> Konva node, so the Transformer can attach
  const transformerRef = useRef(null)
  const [stageSize, setStageSize] = useState({ width: 640, height: 520 })
  const [textBox, setTextBox] = useState(null)
  const [fontSize, setFontSize] = useState(16)
  const [fontFamily, setFontFamily] = useState("Arial")
  const [fontColor, setFontColor] = useState("#000000")
  const [showPenPanel, setShowPenPanel] = useState(false)
  const [showTextPanel, setShowTextPanel] = useState(false)
  const [showMiniPenBar, setShowMiniPenBar] = useState(false)
  const [showShapePanel, setShowShapePanel] = useState(false)
  const [showMiniShapeBar, setShowMiniShapeBar] = useState(false)
  const [eraserSize, setEraserSize] = useState(25)
  const [eraserPos, setEraserPos] = useState(null)
  const isMouseDownRef = useRef(false)
  const [shapePanelPosition, setShapePanelPosition] = useState({
    x: 350,
    y: 70,
  })
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

  // Keep the Transformer attached to the selected shape — but ONLY for
  // types that actually have a transform-end handler wired up below.
  // Attaching to a type with no handler would let someone drag a resize
  // handle that silently does nothing useful.
  useEffect(() => {
    const map = selectedId ? getShapeMapById(selectedId) : null
    const resizableTypes = [
      'rect', 'circle', 'ellipse', 'triangle', 'diamond', 'star',
      'line', 'straight_line', 'arrow', 'text','image',
    ]
    const node = selectedId && resizableTypes.includes(map?.get('type'))
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

      if (e.ctrlKey || e.metaKey) {
        if (e.key === '+' || e.key === '=' || e.code === 'Equal' || e.code === 'NumpadAdd') {
          e.preventDefault()
          setEraserSize((prev) => Math.min(150, prev + 5))
          return
        }
        if (e.key === '-' || e.key === '_' || e.code === 'Minus' || e.code === 'NumpadSubtract') {
          e.preventDefault()
          setEraserSize((prev) => Math.max(5, prev - 5))
          return
        }
      }

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
  function handleImageInsert(event) {
  const file = event.target.files?.[0]
  event.target.value = ''

  if (!file || !file.type.startsWith('image/')) return

  const reader = new FileReader()

  reader.onload = () => {
    const src = reader.result
    const preview = new window.Image()

    preview.onload = () => {
      const maxSize = 360
      const scale = Math.min(
        maxSize / preview.naturalWidth,
        maxSize / preview.naturalHeight,
        1
      )

      const width = preview.naturalWidth * scale
      const height = preview.naturalHeight * scale
      const id = `${awareness.clientID}-${Date.now()}`
      const map = new Y.Map()

      map.set('id', id)
      map.set('type', 'image')
      map.set('src', src)
      map.set('x', Math.max(20, (stageSize.width - width) / 2))
      map.set('y', Math.max(20, (stageSize.height - height) / 2))
      map.set('width', width)
      map.set('height', height)

      shapes.push([map])
      setSelectedId(id)
    }

    preview.src = src
  }

  reader.readAsDataURL(file)
}

  function checkEraserCollision(node, pos, eraserRadius) {
    if (!node) return false
    try {
      const box = node.getClientRect()
      const cx = Math.max(box.x, Math.min(pos.x, box.x + box.width))
      const cy = Math.max(box.y, Math.min(pos.y, box.y + box.height))
      const dist = Math.hypot(pos.x - cx, pos.y - cy)
      return dist <= eraserRadius
    } catch (err) {
      return false
    }
  }

  function sliceLinePoints(points, eraserPos, eraserRadius) {
    if (!points || points.length < 4) return []
    const segments = []
    let currentSeg = []

    for (let i = 0; i < points.length; i += 2) {
      const px = points[i]
      const py = points[i + 1]
      const dist = Math.hypot(px - eraserPos.x, py - eraserPos.y)

      if (dist > eraserRadius) {
        currentSeg.push(px, py)
      } else {
        if (currentSeg.length >= 4) {
          segments.push(currentSeg)
        }
        currentSeg = []
      }
    }

    if (currentSeg.length >= 4) {
      segments.push(currentSeg)
    }

    return segments
  }

  function eraseShapesInRadius(pos) {
    if (!pos) return
    const toDelete = []
    const toSplit = []

    for (const [id, node] of Object.entries(shapeNodeRefs.current)) {
      if (!node) continue
      const map = getShapeMapById(id)
      if (!map) continue

      if (checkEraserCollision(node, pos, eraserSize)) {
        if (map.get('type') === 'line') {
          const pts = map.get('points') || []
          const segs = sliceLinePoints(pts, pos, eraserSize)
          toSplit.push({ id, segs, map })
        } else if (map.get('type') !== 'eraser') {
          toDelete.push(id)
        }
      }
    }

    toSplit.forEach(({ id, segs, map }) => {
      const index = getShapeIndexById(id)
      if (index !== -1) {
        if (segs.length === 0) {
          shapes.delete(index, 1)
        } else {
          map.set('points', segs[0])
          for (let i = 1; i < segs.length; i++) {
            const newId = `${awareness.clientID}-${Date.now()}-${i}`
            const newMap = new Y.Map()
            newMap.set('id', newId)
            newMap.set('type', 'line')
            newMap.set('points', segs[i])
            newMap.set('color', map.get('color'))
            newMap.set('strokeWidth', map.get('strokeWidth'))
            newMap.set('opacity', map.get('opacity'))
            newMap.set('penType', map.get('penType'))
            shapes.insert(index + i, [newMap])
          }
        }
      }
    })

    toDelete.forEach((id) => deleteShape(id))
  }

  function clearCanvas() {
    if (shapes.length === 0) return
    if (window.confirm('Clear all objects from the whiteboard?')) {
      shapes.delete(0, shapes.length)
      setSelectedId(null)
    }
  }

  function pointerPos() {
    const stage = stageRef.current
    return stage ? stage.getPointerPosition() : null
  }

  function handleStageMouseDown(e) {
    isMouseDownRef.current = true
    if (showPenPanel) {
      setShowPenPanel(false)
      setShowMiniPenBar(true)
    }

    const shapeToolsList = ['rect', 'circle', 'ellipse', 'triangle', 'diamond', 'star', 'line', 'arrow']
    if (showShapePanel && shapeToolsList.includes(tool)) {
      setShowShapePanel(false)
      setShowMiniShapeBar(true)
    }

    // Clicked empty canvas background -> clear selection.
    if (e.target === stageRef.current) {
      setSelectedId(null)
    }

    if (tool === "select") return // drawing tools only, below
    if (tool === "delete") {
      const pos = pointerPos()
      if (pos && stageRef.current) {
        const intersectedNode = stageRef.current.getIntersection(pos)
        if (intersectedNode) {
          let targetNode = intersectedNode
          while (targetNode && targetNode !== stageRef.current) {
            const shapeId = Object.keys(shapeNodeRefs.current).find(
              (k) => shapeNodeRefs.current[k] === targetNode
            )
            if (shapeId) {
              deleteShape(shapeId)
              break
            }
            targetNode = targetNode.getParent ? targetNode.getParent() : null
          }
        }
      }
      return
    }
    if (tool === "eraser") {
      const pos = pointerPos()
      if (pos) {
        setEraserPos(pos)
        if (e && e.evt && (e.evt.shiftKey || e.evt.altKey)) {
          eraseShapesInRadius(pos)
          return
        }
        const id = `${awareness.clientID}-${Date.now()}`
        const map = new Y.Map()
        map.set('id', id)
        map.set('type', 'eraser')
        map.set('points', [pos.x, pos.y, pos.x, pos.y])
        map.set('strokeWidth', eraserSize * 2)
        map.set('createdAt', Date.now())

        shapes.push([map])
        drawingShapeId.current = id
        startPoint.current = pos
      }
      return
    }
    if (textBox) return

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
    const isLaser = tool === 'pen' && penType === 'laser'
    map.set('color', isLaser ? '#ff2d2d' : penColor)
    map.set('strokeWidth', strokeWidth)
    map.set('opacity', opacity)
    map.set('penType', isLaser ? 'laser' : 'normal')
    map.set('createdAt', Date.now())

    if (tool === 'pen') {
      map.set('type', 'line')
      map.set('points', [pos.x, pos.y])
    } else if (['rect', 'circle', 'ellipse', 'triangle', 'diamond', 'star'].includes(tool)) {
      map.set('type', tool)
      map.set('x', pos.x)
      map.set('y', pos.y)
      map.set('width', 0)
      map.set('height', 0)
    } else if (['line', 'arrow'].includes(tool)) {
      map.set('type', tool === 'line' ? 'straight_line' : 'arrow')
      map.set('points', [pos.x, pos.y, pos.x, pos.y])
    }

    shapes.push([map])
    drawingShapeId.current = id
    startPoint.current = pos
  }

  function handleStageMouseMove(e) {
    const pos = pointerPos()
    if (!pos) return

    // Broadcast cursor position to everyone else in the room.
    awareness.setLocalStateField('cursor', { x: pos.x, y: pos.y })

    if (tool === 'eraser') {
      setEraserPos(pos)
      if (drawingShapeId.current) {
        const map = getShapeMapById(drawingShapeId.current)
        if (map && map.get('type') === 'eraser') {
          const points = map.get('points')
          map.set('points', [...points, pos.x, pos.y])
        }
      }
      return
    }

    if (!drawingShapeId.current) return
    const map = getShapeMapById(drawingShapeId.current)
    if (!map) return

    if (map.get('type') === 'line') {
      const points = map.get('points')
      map.set('points', [...points, pos.x, pos.y])
    } else if (['rect', 'circle', 'ellipse', 'triangle', 'diamond', 'star'].includes(map.get('type'))) {
      const start = startPoint.current
      map.set('width', pos.x - start.x)
      map.set('height', pos.y - start.y)
    } else if (['straight_line', 'arrow'].includes(map.get('type'))) {
      const start = startPoint.current
      map.set('points', [start.x, start.y, pos.x, pos.y])
    }
  }

  // When the user releases the mouse button, if they were drawing a
  // "laser" line, remove it after a short delay — a temporary highlight
  // effect that disappears automatically.
  function handleStageMouseUp() {
    isMouseDownRef.current = false
    const id = drawingShapeId.current

    if (id) {
      const shape = getShapeMapById(id)
      if (shape && shape.get("penType") === "laser") {
        setTimeout(() => {
          const index = getShapeIndexById(id)
          if (index !== -1) {
            shapes.delete(index, 1)
          }
        }, 1000)
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
    map.set('x', node.x())
    map.set('y', node.y())
  }

  // --- Double click to add/edit text on a shape ---
  function handleShapeDblClick(id, e) {
    if (tool !== 'select') return
    const map = getShapeMapById(id)
    if (!map) return
    const type = map.get('type')
    if (['rect', 'circle', 'ellipse', 'triangle', 'diamond', 'star', 'text'].includes(type)) {
      const node = e.currentTarget
      const absPos = node.getAbsolutePosition()

      setTextBox({
        id: id,
        x: absPos.x,
        y: absPos.y,
        width: Math.max(100, map.get('width') || node.width() || 100),
        height: Math.max(40, map.get('height') || node.height() || 40),
        text: map.get('text') || '',
      })
    }
  }

  // --- Resize a line/arrow via the Transformer handles ---
  function handleLineTransformEnd(id, e) {
    const map = getShapeMapById(id)
    if (!map) return
    const node = e.target
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()

    map.set('x', node.x())
    map.set('y', node.y())
    map.set('rotation', node.rotation())
    map.set('scaleX', (map.get('scaleX') || 1) * scaleX)
    map.set('scaleY', (map.get('scaleY') || 1) * scaleY)

    node.scaleX(1)
    node.scaleY(1)
  }

  // --- Resize a rect-family shape (or standalone text) via the Transformer ---
  function handleRectTransformEnd(id, e) {
    const map = getShapeMapById(id)
    if (!map) return
    const node = e.target
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()

    map.set('x', node.x())
    map.set('y', node.y())
    map.set('rotation', node.rotation())
    if (map.get('type') === 'text') {
      map.set('scaleX', (map.get('scaleX') || 1) * scaleX)
      map.set('scaleY', (map.get('scaleY') || 1) * scaleY)
    } else {
      map.set('width', Math.max(5, (map.get('width') || node.width()) * scaleX))
      map.set('height', Math.max(5, (map.get('height') || node.height()) * scaleY))
    }
    node.scaleX(1)
    node.scaleY(1)
  }

  const otherUsers = Array.from(awareness.getStates().entries()).filter(
    ([clientId]) => clientId !== awareness.clientID
  )

  const selectable = tool === 'select'
  const shapeTools = ['rect', 'circle', 'ellipse', 'triangle', 'diamond', 'star', 'line', 'arrow']
const selectedShapeBox = useMemo(() => {
    if (!selectedId) return null
    const node = shapeNodeRefs.current[selectedId]
    if (!node) return null
    try {
      const box = node.getClientRect()
      return {
        x: box.x + box.width / 2,
        y: Math.max(10, box.y - 45),
      }
    } catch (err) {
      return null
    }
  }, [selectedId, shapes, forceRender])

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-border">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between px-3 py-2 bg-bg-panel border-b border-border text-sm text-text-dim flex-shrink-0 min-w-0">
        <span className="font-medium text-text shrink-0 mr-2">Whiteboard</span>
        
        <div className="flex items-center gap-1.5 min-w-0 max-w-full overflow-x-auto">
          
          {/* MAIN TOOLS (Select, Pen, Eraser, Text, Delete) */}
          <div className="flex gap-0.5 bg-bg-deep rounded-lg p-1 items-center shrink-0">
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

                  if (t === 'pen') {
                    setShowPenPanel(true)
                    setShowTextPanel(false)
                  } else if (t === 'text') {
                    setShowPenPanel(false)
                    setShowTextPanel(true)
                  } else {
                    setShowPenPanel(false)
                    setShowTextPanel(false)
                  }
                  setShowMiniPenBar(false)
                  setShowShapePanel(false)
                  setShowMiniShapeBar(false)
                }}
              >
                {t}
              </button>
            ))}

            {/* SHAPES BUTTON */}
            <button
              className={`px-2.5 py-1 rounded-md text-xs capitalize cursor-pointer transition-colors ${
                shapeTools.includes(tool)
                  ? 'bg-accent text-bg-deep font-semibold'
                  : 'bg-transparent text-text-dim hover:text-text'
              }`}
              onClick={() => {
                if (showShapePanel || showMiniShapeBar) {
                  setShowShapePanel(false)
                  setShowMiniShapeBar(false)
                } else {
                  setShowShapePanel(true)
                  setShowMiniShapeBar(false)
                  setShowPenPanel(false)
                  setShowMiniPenBar(false)
                  setShowTextPanel(false)
                  if (!shapeTools.includes(tool)) {
                    setTool('rect')
                  }
                }
              }}
            >
              Shapes
            </button>
          </div>

          {/* IMAGE INSERTION (From feature/image-insertion) */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageInsert}
          />
          <button
            className="px-2.5 py-1 rounded-md text-xs bg-transparent text-text-dim border border-border hover:opacity-80 shrink-0"
            onClick={() => imageInputRef.current?.click()}
            title="Upload and insert an image"
          >
            Insert Image
          </button>

          {/* ERASER CONTROLS (From dev) */}
          {tool === 'eraser' && (
            <div className="flex items-center gap-1 px-2 py-1 bg-bg-deep border border-border rounded-lg text-xs text-text-dim shrink-0">
              <span className="font-semibold text-text">{eraserSize * 2}px</span>
              <button
                onClick={() => setEraserSize((prev) => Math.max(5, prev - 5))}
                className="px-1.5 py-0.5 rounded bg-bg-panel border border-border hover:text-text font-bold cursor-pointer"
                title="Decrease Size (Ctrl -)"
              >
                -
              </button>
              <button
                onClick={() => setEraserSize((prev) => Math.min(150, prev + 5))}
                className="px-1.5 py-0.5 rounded bg-bg-panel border border-border hover:text-text font-bold cursor-pointer"
                title="Increase Size (Ctrl +)"
              >
                +
              </button>
            </div>
          )}

          {/* BACKGROUND SELECTOR */}
          <select
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            className="px-2 py-1 rounded-md text-xs border border-border bg-white text-black shrink-0"
          >
            <option value="#ffffff">White</option>
            <option value="#000000">Black</option>
            <option value="#008000">Green</option>
          </select>

          <div className="w-px h-5 bg-border shrink-0" />
          
          {/* HISTORY CONTROLS */}
          <button
            className="px-2.5 py-1 rounded-md text-xs bg-transparent text-text-dim border border-border hover:opacity-80 shrink-0"
            onClick={() => undoManager.undo()}
            title="Ctrl+Z"
          >
            undo
          </button>
          <button
            className="px-2.5 py-1 rounded-md text-xs bg-transparent text-text-dim border border-border hover:opacity-80 shrink-0"
            onClick={() => undoManager.redo()}
            title="Ctrl+Shift+Z"
          >
            redo
          </button>

          {/* DELETE / CLEAR CANVAS CONTROLS */}
          {selectedId && (
            <button
              className="px-2.5 py-1 rounded-md text-xs bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white shrink-0 font-medium transition-colors cursor-pointer"
              onClick={() => deleteShape(selectedId)}
              title="Delete Selected Shape"
            >
              delete
            </button>
          )}
          <button
            className="px-2.5 py-1 rounded-md text-xs bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white shrink-0 font-medium transition-colors cursor-pointer"
            onClick={clearCanvas}
            title="Clear all shapes from whiteboard"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* CANVAS AREA */}
      <div ref={canvasWrapRef} className="flex-1 min-h-0 relative" style={{ background }}>
        
        {/* FLOATING DELETE MENU (From dev) */}
        {selectedId && selectedShapeBox && (
          <div
            className="absolute z-40 flex items-center gap-1 px-2 py-1 bg-bg-panel border border-border rounded-lg shadow-xl -translate-x-1/2 transition-all pointer-events-auto"
            style={{
              left: selectedShapeBox.x,
              top: selectedShapeBox.y,
            }}
          >
            <button
              onClick={() => deleteShape(selectedId)}
              className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded text-xs font-semibold cursor-pointer transition-colors"
              title="Delete shape (Delete/Backspace)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        )}

        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onMouseLeave={() => {
            isMouseDownRef.current = false
            setEraserPos(null)
          }}
          style={{
            cursor:
              tool === 'pen' && penType === 'laser'
                ? 'pointer'
                : tool === 'eraser'
                ? 'none'
                : 'default',
          }}
        >
          {/* Make sure your Layer and shapes go here! */}
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
                x: map.get('x') || 0,
                y: map.get('y') || 0,
                rotation: map.get('rotation') || 0,
                scaleX: map.get('scaleX') || 1,
                scaleY: map.get('scaleY') || 1,
                draggable: selectable,
                onClick: (e) => {
                  if (tool === 'delete') {
                    deleteShape(id)
                  } else if (tool === 'eraser') {
                    if (e && e.evt && (e.evt.shiftKey || e.evt.altKey)) {
                      deleteShape(id)
                    }
                  } else if (selectable) {
                    setSelectedId(id)
                  }
                },
                onTap: () => {
                  if (tool === 'delete') {
                    deleteShape(id)
                  } else if (selectable) {
                    setSelectedId(id)
                  }
                },
                onDragEnd: (e) => handleShapeDragEnd(id, e),
                onDblClick: (e) => handleShapeDblClick(id, e),
                onDblTap: (e) => handleShapeDblClick(id, e),
              }

              if (type === 'eraser') {
                return (
                  <Line
                    key={id}
                    ref={(node) => {
                      if (node) shapeNodeRefs.current[id] = node
                      else delete shapeNodeRefs.current[id]
                    }}
                    points={map.get('points') || []}
                    stroke="#000000"
                    strokeWidth={map.get('strokeWidth') || 40}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation="destination-out"
                    listening={false}
                  />
                )
              }

              if (type === 'line' || type === 'straight_line' || type === 'arrow') {
                const isLaser = map.get('penType') === 'laser'
                const strokeProps = {
                  stroke: isSelected ? '#89b4fa' : color,
                  strokeWidth: isLaser
                    ? map.get('strokeWidth') + 1
                    : isSelected
                    ? map.get('strokeWidth') + 1
                    : map.get('strokeWidth'),
                  opacity: (map.get('opacity') ?? 100) / 100,
                  shadowColor: isLaser ? '#ff0000' : undefined,
                  shadowBlur: isLaser ? 12 : 0,
                  shadowOpacity: isLaser ? 1 : 0,
                  shadowEnabled: isLaser,
                }

                if (type === 'arrow') {
                  return (
                    <Arrow
                      {...commonProps}
                      {...strokeProps}
                      points={map.get('points') || []}
                      pointerLength={10}
                      pointerWidth={10}
                      onTransformEnd={(e) => handleLineTransformEnd(id, e)}
                    />
                  )
                }

                return (
                  <Line
                    {...commonProps}
                    {...strokeProps}
                    points={map.get('points') || []}
                    tension={0}
                    lineCap="round"
                    lineJoin="round"
                    onTransformEnd={(e) => handleLineTransformEnd(id, e)}
                  />
                )
              }

              if (['rect', 'circle', 'ellipse', 'triangle', 'diamond', 'star'].includes(type)) {
                const shapeProps = {
                  stroke: map.get('penType') === 'laser' ? '#ff0000' : isSelected ? '#89b4fa' : color,
                  strokeWidth: isSelected ? 3 : 2,
                }

                const w = map.get('width') || 0
                const h = map.get('height') || 0
                const absW = Math.abs(w)
                const absH = Math.abs(h)

                let innerNode = null
                if (type === 'rect') {
                  innerNode = <Rect {...shapeProps} width={w} height={h} />
                } else if (type === 'circle') {
                  innerNode = <Circle {...shapeProps} x={w / 2} y={h / 2} radius={Math.max(absW, absH) / 2} />
                } else if (type === 'ellipse') {
                  innerNode = <Ellipse {...shapeProps} x={w / 2} y={h / 2} radiusX={absW / 2} radiusY={absH / 2} />
                } else if (type === 'triangle') {
                  const pts = [w / 2, 0, w, h, 0, h]
                  innerNode = <Line {...shapeProps} points={pts} closed={true} />
                } else if (type === 'diamond') {
                  const pts = [w / 2, 0, w, h / 2, w / 2, h, 0, h / 2]
                  innerNode = <Line {...shapeProps} points={pts} closed={true} />
                } else if (type === 'star') {
                  innerNode = (
                    <Star
                      {...shapeProps}
                      x={w / 2}
                      y={h / 2}
                      numPoints={5}
                      innerRadius={Math.max(absW, absH) / 4}
                      outerRadius={Math.max(absW, absH) / 2}
                    />
                  )
                }

                return (
                  <Group {...commonProps} width={w} height={h} onTransformEnd={(e) => handleRectTransformEnd(id, e)}>
                    {innerNode}
                    {map.get('text') && (
                      <Text
                        text={map.get('text')}
                        fill={isSelected ? '#89b4fa' : color}
                        fontSize={16}
                        width={absW}
                        height={absH}
                        x={Math.min(0, w)}
                        y={Math.min(0, h)}
                        align="center"
                        verticalAlign="middle"
                      />
                    )}
                  </Group>
                )
              }

              if (type === 'text') {
                return (
                  <Text
                    {...commonProps}
                    text={map.get('text')}
                    fill={isSelected ? '#89b4fa' : map.get('color') || color}
                    fontSize={map.get('fontSize') || 16}
                    fontFamily={map.get('fontFamily') || 'Arial'}
                    onTransformEnd={(e) => handleRectTransformEnd(id, e)}
                  />
                )
              }
              if (type === 'image') {
  return (
    <ImageShape
      {...commonProps}
      src={map.get('src')}
      width={map.get('width') || 0}
      height={map.get('height') || 0}
      onTransformEnd={(e) => handleRectTransformEnd(id, e)}
    />
  )
}

              return null
            })}

            {/* Resize/rotate handles for the selected shape (see the
                resizableTypes list above for exactly which types support
                this) */}
            <Transformer
              ref={transformerRef}
              rotateEnabled={true}
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

          {/* Dedicated top layer for the eraser circle cursor overlay (always stays crisp & visible on top) */}
          <Layer listening={false}>
            {tool === 'eraser' && eraserPos && (
              <Circle
                x={eraserPos.x}
                y={eraserPos.y}
                radius={eraserSize}
                stroke="#ef4444"
                strokeWidth={2}
                dash={[4, 4]}
                fill="rgba(239, 68, 68, 0.15)"
              />
            )}
          </Layer>
        </Stage>

        {showTextPanel && (
          <div
            style={{
              position: 'absolute',
              left: 20,
              top: 70,
              width: 250,
              background: '#fff',
              borderRadius: '16px',
              padding: '18px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
              border: '1px solid #ddd',
              zIndex: 1000,
            }}
          >
            <h3 style={{ marginBottom: 15 }}>Text Settings</h3>

            <div style={{ marginBottom: 15 }}>
              <div style={{ marginBottom: 5 }}>Font Family</div>
              <select
                value={fontFamily}
                style={{ width: '100%', padding: '8px', borderRadius: '8px' }}
                onChange={(e) => {
                  setFontFamily(e.target.value)
                  updateSelectedText('fontFamily', e.target.value)
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
                style={{ width: '100%' }}
                onChange={(e) => {
                  const value = Number(e.target.value)
                  setFontSize(value)
                  updateSelectedText('fontSize', value)
                }}
              />
              <div>{fontSize}px</div>
            </div>

            <div>
              <div style={{ marginBottom: 5 }}>Font Color</div>
              <input
                type="color"
                value={fontColor}
                style={{ width: '100%', height: '40px', border: 'none' }}
                onChange={(e) => {
                  setFontColor(e.target.value)
                  updateSelectedText('color', e.target.value)
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

        {showShapePanel && (
          <ShapePanel
            tool={tool}
            setTool={(t) => setTool(t)}
            penColor={penColor}
            setPenColor={(color) => {
              setPenColor(color)
              if (selectedId) {
                const map = getShapeMapById(selectedId)
                if (map) map.set('color', color)
              }
            }}
            position={shapePanelPosition}
            setPosition={setShapePanelPosition}
            onMinimize={() => {
              setShowShapePanel(false)
              setShowMiniShapeBar(true)
            }}
            onClose={() => {
              setShowShapePanel(false)
              setShowMiniShapeBar(false)
            }}
          />
        )}

        {showMiniShapeBar && (
          <MiniShapeBar
            tool={tool}
            setTool={(t) => setTool(t)}
            penColor={penColor}
            setPenColor={(color) => {
              setPenColor(color)
              if (selectedId) {
                const map = getShapeMapById(selectedId)
                if (map) map.set('color', color)
              }
            }}
            position={shapePanelPosition}
            setPosition={setShapePanelPosition}
            onExpand={() => {
              setShowMiniShapeBar(false)
              setShowShapePanel(true)
            }}
            onClose={() => setShowMiniShapeBar(false)}
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
              if (!textBox.text.trim() && !textBox.id) {
                setTextBox(null)
                return
              }

              if (textBox.id) {
                const map = getShapeMapById(textBox.id)
                if (map) {
                  if (!textBox.text.trim() && map.get('type') === 'text') {
                    const index = getShapeIndexById(textBox.id)
                    if (index !== -1) shapes.delete(index, 1)
                  } else {
                    map.set('text', textBox.text)
                  }
                }
              } else {
                const map = new Y.Map()
                map.set('id', `${awareness.clientID}-${Date.now()}`)
                map.set('type', 'text')
                map.set('x', textBox.x)
                map.set('y', textBox.y)
                map.set('text', textBox.text)
                map.set('fontSize', fontSize)
                map.set('fontFamily', fontFamily)
                map.set('color', fontColor)
                shapes.push([map])
              }

              requestAnimationFrame(() => {
                setTextBox(null)
              })
            }}
            style={{
              position: 'absolute',
              left: textBox.x,
              top: textBox.y,
              width: textBox.width,
              height: textBox.height,
              resize: 'both',
              overflow: 'hidden',
              border: '1px solid #3b82f6',
              outline: 'none',
              background: 'transparent',
              fontSize: '16px',
              padding: '4px',
            }}
          />
        )}
        
      </div>
    </div>
  )
}