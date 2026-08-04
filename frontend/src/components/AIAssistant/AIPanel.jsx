import { useState, useRef, useEffect } from "react";
import { X, Sparkles, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { askAI } from "../../lib/ai";

const AIPanel = ({ isOpen, onClose, aiPrompt, setAiPrompt }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!aiPrompt.trim() || loading) return;
    const userMessage = aiPrompt;
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setAiPrompt("");
    setLoading(true);
    try {
      const result = await askAI(userMessage);
      setMessages((prev) => [...prev, { role: "assistant", text: result.response }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`absolute inset-0 z-40 flex flex-col bg-bg/95 backdrop-blur-2xl transition-all duration-300 ${
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border/50 px-5 bg-bg-panel/60 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center border border-accent/30">
            <Sparkles size={15} className="text-accent" />
          </div>
          <h2 className="text-sm font-semibold text-text">AI Assistant</h2>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="rounded-lg p-1.5 hover:bg-bg-deep/60 text-text-dim hover:text-text transition-colors"
        >
          <X size={16} />
        </motion.button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center px-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,188,212,0.15)]">
              <Sparkles size={30} className="text-accent" />
            </div>
            <h2 className="text-lg font-bold text-text mb-2">AI Coding Assistant</h2>
            <p className="text-sm text-text-dim leading-relaxed max-w-xs">
              Copy code or ask any programming question to get started.
            </p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-accent/20 text-text border border-accent/30 rounded-br-sm"
                      : "bg-bg-panel/70 text-text border border-border/50 rounded-bl-sm"
                  }`}
                >
                  <pre className="whitespace-pre-wrap font-sans">{msg.text}</pre>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-bg-panel/70 border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  className="w-1.5 h-1.5 rounded-full bg-accent"
                />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/50 p-4 bg-bg-panel/40 backdrop-blur-xl shrink-0">
        <div className="flex gap-2 items-center bg-bg-deep/60 border border-border/50 rounded-xl px-3 py-2 focus-within:border-accent/50 transition-colors">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask AI anything..."
            className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-dim"
          />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={loading}
            className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-bg-deep disabled:opacity-40 shrink-0 shadow-[0_0_12px_rgba(0,188,212,0.35)] transition-all"
          >
            <Send size={14} />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default AIPanel;