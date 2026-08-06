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

const COLORS = [
  "#1e1e1e",
  "#e03131",
  "#1971c2",
  "#2f9e44",
  "#f08c00",
  "#ae3ec9",
  "#ff6b6b",
  "#4d96ff",
  "#ffffff"
];

export default function ShapePanel({
  tool,
  setTool,
  penColor,
  setPenColor,
  position,
  setPosition,
  onMinimize,
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <span style={{ fontWeight: "600", fontSize: "15px" }}>Shapes & Lines</span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {onMinimize && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onMinimize}
              title="Minimize Panel"
              style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "14px", color: "#666" }}
            >
              ▲
            </button>
          )}
          <button
            onMouseDown={(e) => e.stopPropagation()} // Prevent dragging
            onClick={onClose}
            style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "16px", color: "#666" }}
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
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

      {/* Color Selector Section */}
      <div style={{ paddingTop: "12px", borderTop: "1px solid #eee" }}>
        <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "10px" }}>
          Shape Color
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {COLORS.map((color) => (
            <div
              key={color}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setPenColor && setPenColor(color)}
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: color,
                cursor: "pointer",
                border: penColor === color ? "2.5px solid #2563eb" : "1px solid #ccc",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                transition: "transform 0.1s",
              }}
              title={color}
            />
          ))}

          {/* Custom Color Input */}
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: 24,
              height: 24,
              borderRadius: "50%",
              overflow: "hidden",
              border: "1px solid #ccc",
              cursor: "pointer",
            }}
            title="Custom Color"
          >
            <input
              type="color"
              value={penColor || "#1e1e1e"}
              onChange={(e) => setPenColor && setPenColor(e.target.value)}
              style={{
                position: "absolute",
                top: -5,
                left: -5,
                width: 34,
                height: 34,
                cursor: "pointer",
                border: "none",
                background: "transparent",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
