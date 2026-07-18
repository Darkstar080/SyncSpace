import { useState } from "react"

export default function MiniPenBar({
  onExpand,
  onClose,
    position,
  setPosition,
}) {

    const [dragging, setDragging] = useState(false)
    const [offset, setOffset] = useState({ x: 0, y: 0 })

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
        width: 250,
        height: 42,
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: "10px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        zIndex: 1000,
      }}
    >
      <span
        style={{
          fontWeight: "600",
          fontSize: "14px",
        }}
      >
        ✏️ Pen Settings
      </span>

      <div
        style={{
          display: "flex",
          gap: "10px",
        }}
      >
        <button
          onClick={onExpand}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          ▼
        </button>

        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}