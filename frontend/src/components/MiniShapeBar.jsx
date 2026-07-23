import { useState } from "react"

const SHAPES = [
  { id: "rect", label: "▭", name: "Rectangle" },
  { id: "circle", label: "◯", name: "Circle" },
  { id: "ellipse", label: "⬭", name: "Ellipse" },
  { id: "line", label: "／", name: "Line" },
  { id: "arrow", label: "➜", name: "Arrow" },
  { id: "triangle", label: "△", name: "Triangle" },
  { id: "diamond", label: "◇", name: "Diamond" },
  { id: "star", label: "★", name: "Star" },
]

const COLORS = [
  "#1e1e1e",
  "#e03131",
  "#1971c2",
  "#2f9e44",
  "#f08c00",
  "#ae3ec9",
  "#ffffff"
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
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const currentShape = SHAPES.find((s) => s.id === tool) || SHAPES[0]

  return (
    <div
      onMouseDown={(e) => {
        setDragging(true)
        setOffset({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        })
      }}
      onMouseMove={(e) => {
        if (!dragging) return
        setPosition({
          x: e.clientX - offset.x,
          y: e.clientY - offset.y,
        })
      }}
      onMouseUp={() => setDragging(false)}
      onMouseLeave={() => setDragging(false)}
      style={{
        position: "absolute",
        top: position.y,
        left: position.x,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "6px 12px",
        zIndex: 1000,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "600", fontSize: "14px" }}>
        <span>Shape: {currentShape.label}</span>
      </div>

      <div style={{ display: "flex", gap: "4px", borderLeft: "1px solid #eee", borderRight: "1px solid #eee", padding: "0 6px" }}>
        {SHAPES.map((shape) => (
          <button
            key={shape.id}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setTool(shape.id)}
            title={shape.name}
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              border: tool === shape.id ? "1.5px solid #2563eb" : "1px solid #eee",
              background: tool === shape.id ? "#eef4ff" : "#f9fafb",
              color: tool === shape.id ? "#2563eb" : "#374151",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: tool === shape.id ? "bold" : "normal",
              transition: "all 0.15s ease",
            }}
          >
            {shape.label}
          </button>
        ))}
      </div>

      {/* Color Dots */}
      <div style={{ display: "flex", gap: "4px", alignItems: "center", borderRight: "1px solid #eee", paddingRight: "6px" }}>
        {COLORS.map((color) => (
          <div
            key={color}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setPenColor && setPenColor(color)}
            style={{
              width: 15,
              height: 15,
              borderRadius: "50%",
              background: color,
              cursor: "pointer",
              border: penColor === color ? "2px solid #2563eb" : "1px solid #ccc",
            }}
            title={color}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onExpand}
          title="Expand Shape Panel"
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: "14px",
            color: "#6b7280",
            padding: "2px 4px",
          }}
        >
          ▼
        </button>

        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onClose}
          title="Close Panel"
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: "14px",
            color: "#6b7280",
            padding: "2px 4px",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
