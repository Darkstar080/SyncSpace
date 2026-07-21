import { useState } from "react";

const SHAPES = [
  { id: "rect", label: "▭ Rectangle" },
  { id: "circle", label: "◯ Circle" },
  { id: "ellipse", label: "⬭ Ellipse" },
  { id: "line", label: "／ Line" },
  { id: "arrow", label: "➜ Arrow" },
  { id: "triangle", label: "△ Triangle" },
  { id: "diamond", label: "◇ Diamond" },
  { id: "star", label: "★ Star" },
];

export default function ShapePanel({
  tool,
  setTool,
  position,
  setPosition,
  onClose,
}) {
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  return (
    <div
      onMouseDown={(e) => {
        setDragging(true);
        setOffset({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        });
      }}
      onMouseMove={(e) => {
        if (!dragging) return;
        setPosition({
          x: e.clientX - offset.x,
          y: e.clientY - offset.y,
        });
      }}
      onMouseUp={() => setDragging(false)}
      onMouseLeave={() => setDragging(false)}
      style={{
        position: "absolute",
        top: position.y,
        left: position.x,
        width: 320,
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 1000,
        userSelect: "none",
        cursor: dragging ? "grabbing" : "grab",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ fontWeight: "600", fontSize: "15px" }}>Shapes & Lines</span>
        <button
          onMouseDown={(e) => e.stopPropagation()} // Prevent dragging
          onClick={onClose}
          style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "16px" }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        {SHAPES.map((shape) => (
          <button
            key={shape.id}
            onMouseDown={(e) => e.stopPropagation()} // Prevent dragging when clicking buttons
            onClick={() => setTool(shape.id)}
            style={{
              padding: "8px",
              borderRadius: "8px",
              border: tool === shape.id ? "2px solid #2563eb" : "1px solid #ddd",
              background: tool === shape.id ? "#eef4ff" : "#fff",
              cursor: "pointer",
              textAlign: "left",
              fontWeight: tool === shape.id ? "600" : "normal",
            }}
          >
            {shape.label}
          </button>
        ))}
      </div>
    </div>
  );
}
