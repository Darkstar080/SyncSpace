import { useState } from "react";
import { X, FileCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const LANGUAGES = [
  { label: "JavaScript", value: "javascript", extension: ".js", color: "text-amber-400" },
  { label: "TypeScript", value: "typescript", extension: ".ts", color: "text-sky" },
  { label: "Python",     value: "python",     extension: ".py", color: "text-accent" },
  { label: "Java",       value: "java",       extension: ".java", color: "text-peach" },
  { label: "C++",        value: "cpp",        extension: ".cpp", color: "text-mauve" },
  { label: "C",          value: "c",          extension: ".c",   color: "text-text-dim" },
];

export default function NewFileModal({ open, onClose, onCreate }) {
  const [fileName, setFileName] = useState("main");
  const [language, setLanguage] = useState("python");


  const handleCreate = () => {
    onCreate({ fileName, language });
    setFileName("main");
    setLanguage("javascript");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-[420px] rounded-2xl bg-bg-panel/90 backdrop-blur-2xl border border-border/50 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center">
                  <FileCode size={14} className="text-accent" />
                </div>
                <h2 className="text-sm font-semibold text-text">New File</h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dim hover:text-accent-2 hover:bg-accent-2/10 transition-colors"
              >
                <X size={15} />
              </motion.button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-dim mb-2 uppercase tracking-wider">File Name</label>
                <input
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full rounded-xl bg-bg-deep/60 border border-border/50 px-3.5 py-2.5 text-sm text-text outline-none focus:border-accent/50 transition-colors placeholder:text-text-dim"
                  placeholder="e.g. main"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-dim mb-2 uppercase tracking-wider">Language</label>
                <div className="grid grid-cols-3 gap-2">
                  {LANGUAGES.map((lang) => (
                    <motion.button
                      key={lang.value}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setLanguage(lang.value)}
                      className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                        language === lang.value
                          ? "border-accent bg-accent/15 text-accent shadow-[0_0_10px_rgba(0,188,212,0.2)]"
                          : "border-border/50 bg-bg-deep/30 text-text-dim hover:border-border hover:text-text"
                      }`}
                    >
                      <span className={language === lang.value ? "" : lang.color}>{lang.label}</span>
                      <span className="block text-[10px] opacity-60 mt-0.5">{lang.extension}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2.5 px-5 py-4 border-t border-border/50">
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-bg-deep/60 border border-border/50 text-text-dim hover:text-text transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={handleCreate}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-accent/20 border border-accent/40 text-accent hover:bg-accent/30 shadow-[0_0_12px_rgba(0,188,212,0.2)] transition-all"
              >
                Create File
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}