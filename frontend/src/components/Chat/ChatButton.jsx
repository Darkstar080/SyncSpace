import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

const ChatButton = ({ onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.92 }}
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-2xl bg-bg-panel/70 backdrop-blur-xl border border-accent/30 text-accent shadow-[0_0_20px_rgba(0,188,212,0.25)] hover:shadow-[0_0_30px_rgba(0,188,212,0.45)] hover:border-accent/60 transition-all"
      style={{ width: 52, height: 52 }}
      title="Chat"
    >
      <MessageCircle size={22} />
    </motion.button>
  );
};

export default ChatButton;