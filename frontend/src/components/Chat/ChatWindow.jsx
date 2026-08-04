import { useState, useRef, useEffect } from "react";
import { X, Minus, Smile, SendHorizontal, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker from "emoji-picker-react";

const ChatWindow = ({ chatMessages, awareness, isOpen, isMinimized, onMinimize, onClose }) => {
  if (!isOpen) return null;

  const dragRef = useRef(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 620 });
  const [dragging, setDragging] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const updateMessages = () => setMessages(chatMessages.toArray());
    updateMessages();
    chatMessages.observe(updateMessages);
    return () => chatMessages.unobserve(updateMessages);
  }, [chatMessages]);

  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMouseDown = (e) => {
    setDragging(true);
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragging) return;
      setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const handleMouseUp = () => setDragging(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  const handleEmojiClick = (emojiData) => {
    setInput((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    const user = awareness.getLocalState()?.user || { name: "Anonymous" };
    chatMessages.push([{
      id: Date.now(),
      sender: user.name,
      text: input,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);
    setInput("");
  };

  const myName = awareness.getLocalState()?.user?.name;

  return (
    <div ref={dragRef} className="fixed z-50 select-none" style={{ left: position.x, top: position.y }}>
      <motion.div
        animate={{ height: isMinimized ? 56 : 540 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden rounded-2xl border border-border/50 bg-bg-panel/80 backdrop-blur-2xl shadow-2xl shadow-black/50"
        style={{ width: 380 }}
      >
        {/* Header / drag bar */}
        <div
          onMouseDown={handleMouseDown}
          className="flex cursor-move items-center justify-between px-4 py-3.5 border-b border-border/50 bg-bg-deep/40 shrink-0"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center">
              <MessageCircle size={14} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text leading-none">Chat</h2>
              <p className="text-[10px] text-text-dim mt-0.5">Room Messages</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={onMinimize}
              className="w-6 h-6 rounded-md flex items-center justify-center text-text-dim hover:text-text hover:bg-bg-deep/60 transition-colors"
            >
              <Minus size={13} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-6 h-6 rounded-md flex items-center justify-center text-text-dim hover:text-accent-2 hover:bg-accent-2/10 transition-colors"
            >
              <X size={13} />
            </motion.button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4 bg-bg/50" style={{ height: 410 }}>
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-xs text-text-dim italic">No messages yet. Say hi! 👋</p>
                </div>
              )}
              <AnimatePresence>
                {messages.map((msg) => {
                  const isMe = msg.sender === myName;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${
                          isMe
                            ? "bg-accent/20 text-text border border-accent/30 rounded-br-sm"
                            : "bg-bg-panel/80 text-text border border-border/50 rounded-bl-sm"
                        }`}
                      >
                        {!isMe && (
                          <p className="text-[10px] font-semibold text-accent mb-1">{msg.sender}</p>
                        )}
                        <p className="text-sm leading-snug">{msg.text}</p>
                        <p className={`text-[10px] mt-1 text-right ${isMe ? "text-accent/50" : "text-text-dim"}`}>
                          {msg.time}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border/50 p-3 bg-bg-panel/40 backdrop-blur-xl">
              <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-bg-deep/50 px-3 py-2 focus-within:border-accent/40 transition-colors">
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setShowEmojiPicker((p) => !p)}
                    className="text-text-dim hover:text-accent transition-colors"
                  >
                    <Smile size={18} />
                  </motion.button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-10 left-0 z-50">
                      <EmojiPicker onEmojiClick={handleEmojiClick} width={300} height={360} theme="dark" />
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Send a message..."
                  className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-dim"
                />
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={sendMessage}
                  className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-bg-deep shrink-0 shadow-[0_0_10px_rgba(0,188,212,0.3)] hover:shadow-[0_0_15px_rgba(0,188,212,0.5)] transition-all"
                >
                  <SendHorizontal size={14} />
                </motion.button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ChatWindow;