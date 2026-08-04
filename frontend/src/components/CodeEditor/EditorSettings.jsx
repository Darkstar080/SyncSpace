import { motion, AnimatePresence } from "framer-motion";

export default function EditorSettings({ open, editorSettings, setEditorSettings }) {
  const rowClass = "flex items-center justify-between px-4 py-2.5 hover:bg-bg-deep/50 transition-colors cursor-pointer";

  const ToggleBadge = ({ value }) => (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${value ? "bg-success/20 text-success border border-success/30" : "bg-bg-deep text-text-dim border border-border/50"}`}>
      {value ? "ON" : "OFF"}
    </span>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-10 w-64 rounded-xl bg-bg-panel/90 backdrop-blur-xl border border-border/50 shadow-2xl z-50 overflow-hidden"
        >
          {/* Theme */}
          <div className={rowClass}>
            <span className="text-sm text-text">Theme</span>
            <select
              value={editorSettings.theme}
              onChange={(e) => setEditorSettings({ ...editorSettings, theme: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-deep border border-border/50 text-text text-xs rounded-lg px-2 py-1 outline-none focus:border-accent/50"
            >
              <option value="vs-dark">VS Dark</option>
              <option value="vs-light">VS Light</option>
              <option value="hc-black">High Contrast</option>
            </select>
          </div>

          {/* Font Size */}
          <div className={rowClass}>
            <span className="text-sm text-text">Font Size</span>
            <select
              value={editorSettings.fontSize}
              onChange={(e) => setEditorSettings({ ...editorSettings, fontSize: Number(e.target.value) })}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-deep border border-border/50 text-text text-xs rounded-lg px-2 py-1 outline-none focus:border-accent/50"
            >
              {[12, 14, 16, 18, 20, 22].map((s) => (
                <option key={s} value={s}>{s}px</option>
              ))}
            </select>
          </div>

          {/* Word Wrap */}
          <div
            onClick={() => setEditorSettings({ ...editorSettings, wordWrap: editorSettings.wordWrap === "on" ? "off" : "on" })}
            className={rowClass}
          >
            <span className="text-sm text-text">Word Wrap</span>
            <ToggleBadge value={editorSettings.wordWrap === "on"} />
          </div>

          {/* Minimap */}
          <div
            onClick={() => setEditorSettings({ ...editorSettings, minimap: !editorSettings.minimap })}
            className={rowClass}
          >
            <span className="text-sm text-text">Minimap</span>
            <ToggleBadge value={editorSettings.minimap} />
          </div>

          {/* Line Numbers */}
          <div
            onClick={() => setEditorSettings({ ...editorSettings, lineNumbers: editorSettings.lineNumbers === "on" ? "off" : "on" })}
            className={rowClass}
          >
            <span className="text-sm text-text">Line Numbers</span>
            <ToggleBadge value={editorSettings.lineNumbers === "on"} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}