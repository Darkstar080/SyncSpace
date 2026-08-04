import { FolderOpen, Save, Settings, Play, ChevronDown, FilePlus, Folder } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import EditorSettings from "./EditorSettings";

const EditorToolbar = ({ onRun, onSave, onNewFile, onOpenFile, onOpenSettings, editorSettings, setEditorSettings }) => {
  const [showFileMenu, setShowFileMenu] = useState(false);
  const fileMenuRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);

  // Close both dropdowns when clicking outside their respective containers
  useEffect(() => {
    function handleClickOutside(e) {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target)) {
        setShowFileMenu(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    }
    // Use 'mousedown' but add a small delay so the toggle button's onClick
    // fires before this closes the panel (avoids instant close on button click)
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItemClass =
    "w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-deep/60 text-text text-sm transition-colors cursor-pointer";

  return (
    <div className="flex items-center gap-1">
      {/* ── File Menu ── */}
      <div className="relative" ref={fileMenuRef}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowFileMenu((p) => !p)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-bg-deep/60 text-text-dim hover:text-text text-xs font-medium transition-colors"
        >
          <FolderOpen size={14} className="text-amber-400" />
          <span>File</span>
          <ChevronDown
            size={12}
            className={`transition-transform duration-200 ${showFileMenu ? "rotate-180" : ""}`}
          />
        </motion.button>

        <AnimatePresence>
          {showFileMenu && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 mt-1.5 w-52 rounded-xl bg-bg-panel/90 backdrop-blur-xl border border-border/50 shadow-2xl z-50 overflow-hidden"
            >
              <button
                onClick={() => { setShowFileMenu(false); onNewFile(); }}
                className={menuItemClass}
              >
                <FilePlus size={14} className="text-accent" />
                <span>New File</span>
              </button>
              <button
                onClick={() => { setShowFileMenu(false); onOpenFile(); }}
                className={menuItemClass}
              >
                <FolderOpen size={14} className="text-amber-400" />
                <span>Open File</span>
              </button>
              <button className={menuItemClass}>
                <Folder size={14} className="text-text-dim" />
                <span>Open Folder</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Save ── */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={onSave}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-bg-deep/60 text-text-dim hover:text-text text-xs font-medium transition-colors"
      >
        <Save size={14} className="text-sky" />
        <span>Save</span>
      </motion.button>

      {/* ── Settings ── */}
      <div className="relative" ref={settingsRef}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowSettings((p) => !p)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-bg-deep/60 text-text-dim hover:text-text text-xs font-medium transition-colors"
        >
          <Settings size={14} className="text-text-dim" />
          <span>Settings</span>
          <ChevronDown
            size={12}
            className={`transition-transform duration-200 ${showSettings ? "rotate-180" : ""}`}
          />
        </motion.button>

        {/* EditorSettings rendered inside the same ref'd wrapper so
            clicks inside it don't fire handleClickOutside */}
        <EditorSettings
          open={showSettings}
          editorSettings={editorSettings}
          setEditorSettings={setEditorSettings}
        />
      </div>

      {/* ── Run ── */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onRun}
        className="flex items-center gap-1.5 bg-success/15 border border-success/30 text-success px-3 py-1.5 rounded-lg text-xs font-semibold shadow-[0_0_10px_rgba(76,175,80,0.2)] hover:shadow-[0_0_18px_rgba(76,175,80,0.35)] hover:bg-success/25 transition-all ml-1"
      >
        <Play size={13} fill="currentColor" />
        <span>Run</span>
      </motion.button>
    </div>
  );
};

export default EditorToolbar;