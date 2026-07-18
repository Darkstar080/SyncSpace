import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Stage, Layer, Line, Rect, Text, Circle, Ellipse, Label, Tag, Transformer, Arrow } from 'react-konva'
import * as Y from 'yjs'

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_TOOLS = ['select', 'pen', 'text']

const SHAPE_LIST = [
  { id: 'rect',     label: 'Rectangle' },
  { id: 'circle',   label: 'Circle'    },
  { id: 'ellipse',  label: 'Ellipse'   },
  { id: 'triangle', label: 'Triangle'  },
  { id: 'diamond',  label: 'Diamond'   },
  { id: 'line',     label: 'Line'      },
  { id: 'arrow',    label: 'Arrow'     },
]

// Shape types that use bounding-box data (x, y, width, height)
const BOX_SHAPES = new Set(['rect', 'circle', 'ellipse', 'triangle', 'diamond'])
// Shape types that use a flat points array
const POINT_SHAPES = new Set(['line', 'arrow'])
// Shape types that get Transformer resize handles
const TRANSFORMABLE = new Set(['rect', 'circle', 'ellipse', 'triangle', 'diamond'])

// ─── Helper: build a new Y.Map for any shape ─────────────────────────────────

function createShapeMap(tool, id, color, pos) {
  const map = new Y.Map()
  map.set('id', id)
  map.set('type', tool)
  map.set('color', color)
  if (BOX_SHAPES.has(tool)) {
    map.set('x', pos.x)
    map.set('y', pos.y)
    map.set('width', 0)
    map.set('height', 0)
  } else if (POINT_SHAPES.has(tool)) {
    map.set('points', [pos.x, pos.y, pos.x, pos.y])
  }
  return map
}

// ─── Helper: update shape geometry while dragging ────────────────────────────

function updateShapeOnMove(map, pos, start) {
  const type = map.get('type')
  if (BOX_SHAPES.has(type)) {
    map.set('x', Math.min(pos.x, start.x))
    map.set('y', Math.min(pos.y, start.y))
    map.set('width', Math.abs(pos.x - start.x))
    map.set('height', Math.abs(pos.y - start.y))
  } else if (POINT_SHAPES.has(type)) {
    map.set('points', [start.x, start.y, pos.x, pos.y])
  }
}

// ─── Helper: render a shape from a Y.Map ─────────────────────────────────────
// `onDblClick` is injected by the parent to open the label editor for box shapes.

function renderShape(map, commonProps, isSelected, onDblClick) {
  const type  = map.get('type')
  const color = map.get('color') || '#111'
  const stroke      = isSelected ? '#89b4fa' : color
  const strokeWidth = isSelected ? 3 : 2

  const x = map.get('x') ?? 0
  const y = map.get('y') ?? 0
  const w = map.get('width')  ?? 0
  const h = map.get('height') ?? 0
  const pts   = map.get('points') || []
  const label = map.get('label') || ''

  // Spread dblClick into commonProps for box shapes
  const boxProps = onDblClick ? { ...commonProps, onDblClick, onDblTap: onDblClick } : commonProps

  switch (type) {
    case 'rect':
      return (
        <>
          <Rect {...boxProps} x={x} y={y} width={w} height={h} stroke={stroke} strokeWidth={strokeWidth} />
          {label ? <Text listening={false} x={x} y={y + h / 2 - 8} width={w} align="center" text={label} fill={color} fontSize={14} /> : null}
        </>
      )

    case 'circle': {
      const r = Math.max(Math.abs(w), Math.abs(h)) / 2
      const cx = x + Math.abs(w) / 2
      const cy = y + Math.abs(h) / 2
      return (
        <>
          <Circle {...boxProps} x={cx} y={cy} radius={r} stroke={stroke} strokeWidth={strokeWidth} />
          {label ? <Text listening={false} x={cx - r} y={cy - 8} width={r * 2} align="center" text={label} fill={color} fontSize={14} /> : null}
        </>
      )
    }

    case 'ellipse': {
      const rx = Math.abs(w) / 2
      const ry = Math.abs(h) / 2
      const cx = x + rx
      const cy = y + ry
      return (
        <>
          <Ellipse {...boxProps} x={cx} y={cy} radiusX={rx} radiusY={ry} stroke={stroke} strokeWidth={strokeWidth} />
          {label ? <Text listening={false} x={x} y={cy - 8} width={w} align="center" text={label} fill={color} fontSize={14} /> : null}
        </>
      )
    }

    case 'triangle': {
      const pts2 = [w / 2, 0, w, h, 0, h]
      return (
        <>
          <Line {...boxProps} x={x} y={y} points={pts2} closed stroke={stroke} strokeWidth={strokeWidth} />
          {label ? <Text listening={false} x={x} y={y + h * 0.6 - 8} width={w} align="center" text={label} fill={color} fontSize={14} /> : null}
        </>
      )
    }

    case 'diamond': {
      const pts2 = [w / 2, 0, w, h / 2, w / 2, h, 0, h / 2]
      return (
        <>
          <Line {...boxProps} x={x} y={y} points={pts2} closed stroke={stroke} strokeWidth={strokeWidth} />
          {label ? <Text listening={false} x={x} y={y + h / 2 - 8} width={w} align="center" text={label} fill={color} fontSize={14} /> : null}
        </>
      )
    }

    case 'line':
      return (
        <Line {...commonProps}
          points={pts} stroke={stroke} strokeWidth={strokeWidth}
          lineCap="round" lineJoin="round"
        />
      )

    case 'arrow':
      return (
        <Arrow {...commonProps}
          points={pts} stroke={stroke} fill={stroke} strokeWidth={strokeWidth}
          pointerLength={12} pointerWidth={10} lineCap="round"
        />
      )

    case 'text':
      return (
        <Text {...commonProps}
          x={x} y={y}
          text={map.get('text')}
          fill={isSelected ? '#89b4fa' : color}
          fontSize={16}
        />
      )

    // pen free-draw strokes are stored with type 'pen-line'
    case 'pen-line':
      return (
        <Line {...commonProps}
          points={pts}
          stroke={isSelected ? '#89b4fa' : color}
          strokeWidth={isSelected ? 3.5 : 2.5}
          tension={0} lineCap="round" lineJoin="round"
        />
      )

    default:
      return null
  }
}

// ─── ShapeDropdown ────────────────────────────────────────────────────────────

function ShapeDropdown({ selectedShape, onSelect, isActive, onActivate }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  const current = SHAPE_LIST.find((s) => s.id === selectedShape) || SHAPE_LIST[0]

  function handleSelect(shape) {
    onSelect(shape.id)   // parent already calls setSelectedShape + setTool
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => { setOpen((o) => !o); onActivate() }}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', borderRadius: 6, fontSize: 12,
          cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
          background: isActive ? 'var(--color-accent)' : 'transparent',
          color: isActive ? 'var(--color-bg-deep)' : 'var(--color-text-dim)',
          fontWeight: isActive ? 600 : 400,
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        <span>{current.label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
          minWidth: 130,
          background: 'var(--color-bg-panel)',
          border: '1px solid var(--color-border)',
          borderRadius: 8, padding: 4,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', gap: 1,
        }}>
          {SHAPE_LIST.map((shape) => {
            const active = shape.id === selectedShape
            return (
              <button
                key={shape.id}
                onClick={() => handleSelect(shape)}
                style={{
                  textAlign: 'left', padding: '6px 10px', borderRadius: 5,
                  fontSize: 12, cursor: 'pointer', border: 'none',
                  background: active ? 'rgba(137,180,250,0.15)' : 'transparent',
                  color: active ? 'var(--color-accent)' : 'var(--color-text)',
                  fontWeight: active ? 600 : 400,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                {shape.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── IMPORTANT PATTERN — read before touching this file ──────────────────────
//
// Konva never holds its own "source of truth" for shapes. Every shape drawn is
// written into `shapes` (a Y.Array of Y.Map, see lib/yjs.js). The canvas only
// ever RENDERS what's in that array — making concurrent drawing merge correctly.
//
// SELECTION is purely local React state (`selectedId`) — never in the Y.Doc.
// Everything about the shape ITSELF lives only in its Y.Map.
//
// UNDO: scoped to the `shapes` type via Y.UndoManager; tracks LOCAL edits only.

export default function Whiteboard({ shapes, awareness }) {
  const [, forceRender] = useReducer((x) => x + 1, 0)
  const [tool, setTool]               = useState('select')
  const [selectedShape, setSelectedShape] = useState('rect') // active shape in dropdown
  const [selectedId, setSelectedId]   = useState(null)
  const drawingShapeId = useRef(null)
  const startPoint     = useRef(null)
  const stageRef       = useRef(null)
  const canvasWrapRef  = useRef(null)
  const shapeNodeRefs  = useRef({})
  const transformerRef = useRef(null)
  const [stageSize, setStageSize] = useState({ width: 640, height: 520 })
  const [textBox, setTextBox]     = useState(null)
  // labelBox: { id, x, y, w, h, text } — floating textarea for editing a shape label
  const [labelBox, setLabelBox]   = useState(null)

  // True when a shape-tool (not a base tool) is active
  const shapeToolActive = SHAPE_LIST.some((s) => s.id === tool)

  // ── Resize canvas to fill its container ────────────────────────────────────
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

  const undoManager = useMemo(() => new Y.UndoManager(shapes), [shapes])

  // Re-render on remote shape changes
  useEffect(() => {
    const rerender = () => forceRender()
    shapes.observeDeep(rerender)
    return () => shapes.unobserveDeep(rerender)
  }, [shapes])

  // Re-render on cursor/awareness changes
  useEffect(() => {
    const rerender = () => forceRender()
    awareness.on('change', rerender)
    return () => awareness.off('change', rerender)
  }, [awareness])

  // Attach Transformer to selected shape (only TRANSFORMABLE types)
  useEffect(() => {
    const map  = selectedId ? getShapeMapById(selectedId) : null
    const type = map?.get('type')
    const node = selectedId && TRANSFORMABLE.has(type)
      ? shapeNodeRefs.current[selectedId]
      : null
    if (transformerRef.current) {
      transformerRef.current.nodes(node ? [node] : [])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [selectedId, shapes])

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT') return

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        deleteShape(selectedId)
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        e.shiftKey ? undoManager.redo() : undoManager.undo()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        undoManager.redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, undoManager])

  // ── Y.Map helpers ──────────────────────────────────────────────────────────

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
    return stageRef.current.getPointerPosition()
  }

  // ── Canvas event handlers ─────────────────────────────────────────────────

  function handleStageMouseDown(e) {
    if (e.target === stageRef.current) setSelectedId(null)
    if (tool === 'select') return

    const pos   = pointerPos()
    const id    = `${awareness.clientID}-${Date.now()}`
    const color = awareness.getLocalState()?.user?.color || '#000'

    if (tool === 'text') {
      setTextBox({ x: pos.x, y: pos.y, width: 200, height: 80, text: '' })
      return
    }

    if (tool === 'pen') {
      const map = new Y.Map()
      map.set('id', id)
      map.set('type', 'pen-line')
      map.set('color', color)
      map.set('points', [pos.x, pos.y])
      shapes.push([map])
      drawingShapeId.current = id
      startPoint.current = pos
      return
    }

    // All shape-dropdown tools
    const map = createShapeMap(tool, id, color, pos)
    shapes.push([map])
    drawingShapeId.current = id
    startPoint.current = pos
  }

  function handleStageMouseMove() {
    const pos = pointerPos()
    if (!pos) return

    awareness.setLocalStateField('cursor', { x: pos.x, y: pos.y })

    if (!drawingShapeId.current) return
    const map = getShapeMapById(drawingShapeId.current)
    if (!map) return

    const type = map.get('type')

    if (type === 'pen-line') {
      const points = map.get('points')
      map.set('points', [...points, pos.x, pos.y])
    } else if (BOX_SHAPES.has(type) || POINT_SHAPES.has(type)) {
      updateShapeOnMove(map, pos, startPoint.current)
    }
  }

  function handleStageMouseUp() {
    drawingShapeId.current = null
    startPoint.current = null
  }

  // ── Drag ───────────────────────────────────────────────────────────────────

  function handleShapeDragEnd(id, e) {
    const map = getShapeMapById(id)
    if (!map) return
    const node = e.target
    const type = map.get('type')

    if (type === 'pen-line' || POINT_SHAPES.has(type)) {
      const dx = node.x(), dy = node.y()
      const old = map.get('points')
      map.set('points', old.map((v, i) => (i % 2 === 0 ? v + dx : v + dy)))
      node.position({ x: 0, y: 0 })
    } else {
      map.set('x', node.x())
      map.set('y', node.y())
    }
  }

  // ── Transformer resize (box shapes) ───────────────────────────────────────

  function handleTransformEnd(id, e) {
    const map = getShapeMapById(id)
    if (!map) return
    const node   = e.target
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    map.set('x', node.x())
    map.set('y', node.y())
    map.set('width',  Math.max(5, node.width()  * scaleX))
    map.set('height', Math.max(5, node.height() * scaleY))
    node.scaleX(1)
    node.scaleY(1)
  }

  // ── Label editing: double-click a box shape to add/edit its text ─────────

  function openLabelEditor(id) {
    const map = getShapeMapById(id)
    if (!map || !BOX_SHAPES.has(map.get('type'))) return
    setLabelBox({
      id,
      x: map.get('x') ?? 0,
      y: map.get('y') ?? 0,
      w: map.get('width') ?? 100,
      h: map.get('height') ?? 60,
      text: map.get('label') || '',
    })
  }

  function commitLabel() {
    if (!labelBox) return
    const map = getShapeMapById(labelBox.id)
    if (map) map.set('label', labelBox.text)
    setLabelBox(null)
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const selectable = tool === 'select'

  const makeCommonProps = useCallback(
    (id) => ({
      key: id,
      ref: (node) => {
        if (node) shapeNodeRefs.current[id] = node
        else delete shapeNodeRefs.current[id]
      },
      draggable: selectable,
      onClick:  () => selectable && setSelectedId(id),
      onTap:    () => selectable && setSelectedId(id),
      onDragEnd: (e) => handleShapeDragEnd(id, e),
      onTransformEnd: (e) => handleTransformEnd(id, e),
    }),
    [selectable]
  )

  const otherUsers = Array.from(awareness.getStates().entries()).filter(
    ([clientId]) => clientId !== awareness.clientID
  )

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-border">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-panel border-b border-border text-sm text-text-dim flex-shrink-0">
        <span className="font-medium text-text">Whiteboard</span>
        <div className="flex items-center gap-2">

          {/* Tool buttons */}
          <div className="flex gap-0.5 bg-bg-deep rounded-lg p-1 items-center">
            {BASE_TOOLS.map((t) => (
              <button
                key={t}
                className={`px-2.5 py-1 rounded-md text-xs capitalize cursor-pointer transition-colors ${
                  tool === t
                    ? 'bg-accent text-bg-deep font-semibold'
                    : 'bg-transparent text-text-dim hover:text-text'
                }`}
                onClick={() => setTool(t)}
              >
                {t}
              </button>
            ))}

            {/* Shapes dropdown */}
            <ShapeDropdown
              selectedShape={selectedShape}
              onSelect={(id) => { setSelectedShape(id); setTool(id) }}
              isActive={shapeToolActive}
              onActivate={() => setTool(selectedShape)}
            />
          </div>

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

      {/* ── Canvas ──────────────────────────────────────────────────────── */}
      <div ref={canvasWrapRef} className="flex-1 min-h-0 bg-bg-deep relative">
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
              const id   = map.get('id')
              const type = map.get('type')
              // Pass a dblClick handler only for box shapes in select mode
              const dblClick = selectable && BOX_SHAPES.has(type)
                ? () => openLabelEditor(id)
                : undefined
              return renderShape(map, makeCommonProps(id), id === selectedId, dblClick)
            })}

            {/* Transformer — attaches to TRANSFORMABLE shapes only */}
            <Transformer
              ref={transformerRef}
              rotateEnabled={false}
              flipEnabled={false}
              boundBoxFunc={(oldBox, newBox) =>
                newBox.width < 5 || newBox.height < 5 ? oldBox : newBox
              }
            />

            {/* Remote cursors */}
            {otherUsers.map(([clientId, state]) => {
              if (!state?.cursor) return null
              const { x, y } = state.cursor
              const name  = state.user?.name  || 'Guest'
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
                  x={state.cursor.x} y={state.cursor.y}
                  radius={4} fill={state.user?.color || '#888'}
                />
              ) : null
            )}
          </Layer>
        </Stage>

        {/* Floating textarea for standalone Text tool */}
        {textBox && (
          <textarea
            autoFocus
            value={textBox.text}
            onChange={(e) => setTextBox({ ...textBox, text: e.target.value })}
            onBlur={() => {
              if (!textBox.text.trim()) { setTextBox(null); return }
              const map = new Y.Map()
              map.set('id',    `${awareness.clientID}-${Date.now()}`)
              map.set('type',  'text')
              map.set('x',     textBox.x)
              map.set('y',     textBox.y)
              map.set('text',  textBox.text)
              map.set('color', awareness.getLocalState()?.user?.color || '#000')
              shapes.push([map])
              setTextBox(null)
            }}
            style={{
              position: 'absolute',
              left: textBox.x, top: textBox.y,
              width: textBox.width, height: textBox.height,
              resize: 'both', overflow: 'hidden',
              border: '1px solid #3b82f6', outline: 'none',
              background: 'transparent', fontSize: '16px', padding: '4px',
            }}
          />
        )}

        {/* Floating textarea for shape label editor (double-click in select mode) */}
        {labelBox && (
          <textarea
            autoFocus
            value={labelBox.text}
            placeholder="Type label..."
            onChange={(e) => setLabelBox({ ...labelBox, text: e.target.value })}
            onBlur={commitLabel}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setLabelBox(null)
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitLabel() }
            }}
            style={{
              position: 'absolute',
              left: labelBox.x,
              top: labelBox.y + labelBox.h / 2 - 20,
              width: Math.max(labelBox.w, 80),
              minHeight: 40,
              resize: 'none',
              overflow: 'hidden',
              border: '2px dashed #89b4fa',
              borderRadius: 4,
              outline: 'none',
              background: 'rgba(255,255,255,0.85)',
              fontSize: '14px',
              textAlign: 'center',
              padding: '4px 6px',
              zIndex: 10,
            }}
          />
        )}
      </div>
    </div>
  )
}