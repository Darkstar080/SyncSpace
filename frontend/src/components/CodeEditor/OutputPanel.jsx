import { motion, AnimatePresence } from "framer-motion";
import { Terminal, X } from "lucide-react";

const OutputPanel = ({ isOpen, onClose, output }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "45%", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="bg-bg-panel/80 backdrop-blur-xl border-t border-border/50 flex flex-col overflow-hidden shrink-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-success" />
              <span className="text-xs font-semibold text-text">Output</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-5 h-5 rounded-md flex items-center justify-center text-text-dim hover:text-accent-2 hover:bg-accent-2/10 transition-colors"
            >
              <X size={12} />
            </motion.button>
          </div>

          {/* Output content */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs text-text leading-relaxed whitespace-pre-wrap">
            {output ? (
              <span className="text-success/90">{output}</span>
            ) : (
              <span className="text-text-dim italic">Output will appear here...</span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OutputPanel;