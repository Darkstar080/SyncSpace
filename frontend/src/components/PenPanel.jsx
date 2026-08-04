import { motion } from "framer-motion"

const COLORS = [
  "#00bcd4",
  "#ff4081",
  "#4caf50",
  "#9c27b0",
  "#ff9800",
  "#03a9f4",
  "#e0e0e0",
]

const STROKE_WIDTHS = [2, 4, 8]

export default function PenPanel({
  penColor,
  setPenColor,
  strokeWidth,
  setStrokeWidth,
  opacity,
  setOpacity,
  penType,
  setPenType,
  position,
  setPosition,
}) {
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: position.y,
        left: position.x,
        width: 300,
        zIndex: 1000,
      }}
      className="bg-bg-panel/70 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-2xl"
    >
      {/* Header */}
      <p className="text-xs font-bold text-text-dim uppercase tracking-widest mb-4">
        ✏️ Pen Settings
      </p>

      {/* Stroke Width */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-text-dim mb-2 uppercase tracking-wider">Stroke Width</p>
        <div className="flex gap-2">
          {STROKE_WIDTHS.map((width) => (
            <motion.button
              key={width}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setStrokeWidth(width)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center border cursor-pointer transition-all ${
                strokeWidth === width
                  ? "border-accent bg-accent/15 shadow-[0_0_10px_rgba(0,188,212,0.25)]"
                  : "border-border/50 bg-bg-deep/30 hover:border-border"
              }`}
            >
              <div
                className="rounded-full bg-text"
                style={{ width: 22, height: width }}
              />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Stroke Color */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-text-dim mb-2 uppercase tracking-wider">Stroke Color</p>
        <div className="flex flex-wrap gap-2 items-center">
          {COLORS.map((color) => (
            <motion.div
              key={color}
              whileHover={{ scale: 1.25 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setPenColor(color)}
              className={`w-5 h-5 rounded-full cursor-pointer border ${
                penColor === color ? "border-accent" : "border-border/50"
              }`}
              style={{ background: color }}
              title={color}
            />
          ))}

          {/* Custom color picker */}
          <div
            className="relative w-5 h-5 rounded-full overflow-hidden border border-border/50 cursor-pointer"
            title="Custom Color"
          >
            <input
              type="color"
              value={penColor || "#00bcd4"}
              onChange={(e) => setPenColor(e.target.value)}
              className="absolute inset-0 w-full h-full cursor-pointer border-none bg-transparent"
              style={{ opacity: 0.01 }}
            />
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}
            />
          </div>
        </div>
      </div>

      {/* Opacity */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-text-dim mb-2 uppercase tracking-wider">
          Opacity — <span className="text-accent">{opacity}%</span>
        </p>
        <input
          type="range"
          min="0"
          max="100"
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="w-full cursor-pointer accent-[#00bcd4]"
        />
      </div>

      {/* Special Pen */}
      <div>
        <p className="text-xs font-semibold text-text-dim mb-2 uppercase tracking-wider">Special Pen</p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setPenType(penType === "laser" ? "normal" : "laser")}
          className={`w-full py-2.5 rounded-xl font-semibold text-sm cursor-pointer border transition-all ${
            penType === "laser"
              ? "border-accent-2 bg-accent-2/15 text-accent-2 shadow-[0_0_12px_rgba(255,64,129,0.3)]"
              : "border-border/50 bg-bg-deep/30 text-text-dim hover:border-border hover:text-text"
          }`}
        >
          ✨ 🔦 Laser Pointer {penType === "laser" ? "(ON)" : "(OFF)"}
        </motion.button>
      </div>
    </div>
  )
}