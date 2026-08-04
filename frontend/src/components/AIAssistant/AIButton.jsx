import { Bot } from "lucide-react";
import { motion } from "framer-motion";

const AIButton = ({ onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.92 }}
      className="fixed bottom-24 right-6 z-50 flex h-13 w-13 items-center justify-center rounded-2xl bg-bg-panel/70 backdrop-blur-xl border border-accent/30 text-accent shadow-[0_0_20px_rgba(0,188,212,0.25)] transition-all hover:shadow-[0_0_30px_rgba(0,188,212,0.45)] hover:border-accent/60"
      style={{ width: 52, height: 52 }}
      title="AI Assistant"
    >
      <Bot size={22} />
    </motion.button>
  );
};

export default AIButton;