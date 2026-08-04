import { useState } from "react"
import { motion } from "framer-motion"

const SHAPES = [
  { id: "rect",     label: "▭", name: "Rectangle" },
  { id: "circle",   label: "◯", name: "Circle" },
  { id: "ellipse",  label: "⬭", name: "Ellipse" },
  { id: "line",     label: "／", name: "Line" },
  { id: "arrow",    label: "➜", name: "Arrow" },
  { id: "triangle", label: "△", name: "Triangle" },
  { id: "diamond",  label: "◇", name: "Diamond" },
  { id: "star",     label: "★", name: "Star" },
]

const COLORS = [
  "#0a0a0a",
  "#00bcd4",
  "#ff4081",
  "#4caf50",
  "#9c27b0",
  "#ff9800",
  "#e0e0e0",
]

export default function MiniShapeBar({
  tool,
  setTool,
  penColor,
  setPenColor,
  onExpand,
  onClose,
  position,
  setPosition,
}) {
  const [dragging, setDragging] = useState(false)
  const [offset, setOffset]     = useState({ x: 0, y: 0 })

  const currentShape = SHAPES.find((s) => s.id === tool) || SHAPES[0]

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragStart={(e, info) => {
        setDragging(true)
        setOffset({ x: info.point.x - position.x, y: info.point.y - position.y })
      }}
      onDragEnd={() => setDragging(false)}
      style={{
        position: "absolute",
        top: position.y,
        left: position.x,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        zIndex: 1000,
      }}
      className="bg-bg-panel/70 backdrop-blur-xl border border-border/50 rounded-2xl flex items-center gap-3 px-3 py-2 shadow-2xl"
    >
      {/* Current shape label */}
      <span className="font-semibold text-sm text-text whitespace-nowrap">
        Shape: {currentShape.label}
      </span>

      {/* Shape buttons */}
      <div className="flex gap-1 border-l border-r border-border/40 px-2">
        {SHAPES.map((shape) => (
          <motion.button
            key={shape.id}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setTool(shape.id)}
            title={shape.name}
            className={`w-7 h-7 rounded-lg text-sm cursor-pointer flex items-center justify-center border transition-all ${
              tool === shape.id
                ? "border-accent bg-accent/15 text-accent shadow-[0_0_8px_rgba(0,188,212,0.3)]"
                : "border-border/40 bg-bg-deep/30 text-text-dim hover:text-text hover:border-border"
            }`}
          >
            {shape.label}
          </motion.button>
        ))}
      </div>

      {/* Color dots */}
      <div className="flex gap-1 items-center border-r border-border/40 pr-2">
        {COLORS.map((color) => (
          <motion.div
            key={color}
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.9 }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setPenColor && setPenColor(color)}
            className={`w-4 h-4 rounded-full cursor-pointer border ${
              penColor === color ? "border-accent" : "border-border/50"
            }`}
            style={{ background: color }}
            title={color}
          />
        ))}
      </div>

      {/* Expand / Close */}
      <div className="flex gap-1 items-center">
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onExpand}
          title="Expand Shape Panel"
          className="border-none bg-transparent cursor-pointer text-xs text-text-dim hover:text-accent transition-colors"
        >
          ▼
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onClose}
          title="Close Panel"
          className="border-none bg-transparent cursor-pointer text-xs text-text-dim hover:text-accent-2 transition-colors"
        >
          ✕
        </motion.button>
      </div>
    </motion.div>
  )
}
