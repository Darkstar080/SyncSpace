import { useState } from "react"
import { motion } from "framer-motion"

export default function MiniPenBar({
  onExpand,
  onClose,
  position,
  setPosition,
}) {
  const [dragging, setDragging] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

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
        width: 250,
        height: 42,
        zIndex: 1000,
      }}
      className="bg-bg-panel/60 backdrop-blur-xl border border-border/50 rounded-xl flex items-center justify-between px-3 py-1.5 shadow-2xl"
    >
      <span className="font-semibold text-sm text-text">
        ✏️ Pen Settings
      </span>

      <div className="flex gap-2 items-center">
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={onExpand}
          className="border-none bg-transparent cursor-pointer text-sm text-text-dim hover:text-accent transition-colors"
          title="Expand"
        >
          ▼
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="border-none bg-transparent cursor-pointer text-sm text-text-dim hover:text-accent-2 transition-colors"
          title="Close"
        >
          ✕
        </motion.button>
      </div>
    </motion.div>
  )
}