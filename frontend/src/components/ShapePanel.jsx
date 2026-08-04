import { useState } from "react";
import { motion } from "framer-motion";

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
  "#0a0a0a",
  "#00bcd4",
  "#ff4081",
  "#4caf50",
  "#9c27b0",
  "#ff9800",
  "#03a9f4",
  "#e0e0e0",
  "#a0a0a0"
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
    <motion.div
      drag={true}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragStart={(e, info) => {
        setDragging(true);
        setOffset({ x: info.point.x - position.x, y: info.point.y - position.y });
      }}
      onDragEnd={() => setDragging(false)}
      style={{
        position: "absolute",
        top: position.y,
        left: position.x,
        width: 320,
        zIndex: 1000,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
      }}
      className="bg-bg-panel/60 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-2xl"
    >
      <div className="flex justify-between items-center mb-3">
        <span className="font-semibold text-sm text-text">Shapes & Lines</span>
        <div className="flex gap-2 items-center">
          {onMinimize && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onMinimize}
              title="Minimize Panel"
              className="border-none bg-transparent cursor-pointer text-sm text-text-dim hover:text-text"
            >
              ▲
            </button>
          )}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onClose}
            className="border-none bg-transparent cursor-pointer text-sm text-text-dim hover:text-text"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {SHAPES.map((shape) => (
          <button
            key={shape.id}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setTool(shape.id)}
            className={`p-2 rounded-lg border ${tool === shape.id ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-deep/30 text-text"}`}
          >
            {shape.label}
          </button>
        ))}
      </div>

      {/* Color Selector Section */}
      <div className="pt-3 border-t border-border/30">
        <div className="text-sm font-semibold mb-2 text-text">Shape Color</div>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((color) => (
            <div
              key={color}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setPenColor && setPenColor(color)}
              className={`w-5 h-5 rounded-full cursor-pointer border ${penColor === color ? "border-accent" : "border-border"}`}
              style={{ background: color }}
              title={color}
            />
          ))}

          {/* Custom Color Input */}
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="relative w-6 h-6 rounded-full overflow-hidden border border-border cursor-pointer"
            title="Custom Color"
          >
            <input
              type="color"
              value={penColor || "#0a0a0a"}
              onChange={(e) => setPenColor && setPenColor(e.target.value)}
              className="absolute inset-0 w-full h-full cursor-pointer border-none bg-transparent"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
