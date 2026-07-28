import { useState, useRef, useEffect } from "react";
import { X, Minus, Smile, SendHorizontal } from "lucide-react";
import EmojiPicker from "emoji-picker-react";

const ChatWindow = ({
  chatMessages,
  awareness,
  isOpen,
  isMinimized,
  onMinimize,
  onClose,
}) => {
  if (!isOpen) return null;

  const dragRef = useRef(null);

  const [position, setPosition] = useState({
    x: window.innerWidth - 420,
    y: window.innerHeight - 620,
  });

  const [dragging, setDragging] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const dragOffset = useRef({
    x: 0,
    y: 0,
  });

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

    useEffect(() => {
      const updateMessages = () => {
        setMessages(chatMessages.toArray());
      };

      updateMessages();

      chatMessages.observe(updateMessages);

      return () => chatMessages.unobserve(updateMessages);
    }, [chatMessages]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const handleMouseDown = (e) => {
    setDragging(true);

    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragging) return;

      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };

    const handleMouseUp = () => {
      setDragging(false);
    };

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

  const user =
    awareness.getLocalState()?.user || {
      name: "Anonymous",
    };

  chatMessages.push([
    {
      id: Date.now(),
      sender: user.name,
      text: input,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  setInput("");
};

    return (
    <div
      ref={dragRef}
      className="fixed z-50 select-none"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div
        className={`overflow-hidden rounded-2xl border border-border bg-bg-panel shadow-2xl transition-all duration-300 ${
          isMinimized ? "h-16 w-[380px]" : "h-[550px] w-[380px]"
        }`}
      >
        <div
          onMouseDown={handleMouseDown}
          className="flex cursor-move items-center justify-between bg-accent px-5 py-4 text-bg-deep"
        >
          <div>
            <h2 className="text-lg font-semibold">Chat</h2>
            <p className="text-xs opacity-70">
              Room Messages
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onMinimize}
              className="rounded-full p-1 transition hover:brightness-90"
            >
              <Minus size={18} />
            </button>

            <button
              onClick={onClose}
              className="rounded-full p-1 transition hover:brightness-90"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto bg-bg p-4 h-[410px]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender === awareness.getLocalState()?.user?.name ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.sender === awareness.getLocalState()?.user?.name
                        ? "rounded-br-sm bg-accent text-bg-deep"
                        : "rounded-bl-sm bg-bg-deep text-text"
                    }`}
                  >
                    {msg.sender !== awareness.getLocalState()?.user?.name && (
                      <p className="text-xs font-semibold text-accent">
                        {msg.sender}
                      </p>
                    )}

                    <p className="mt-1 text-sm">
                      {msg.text}
                    </p>

                    <p
                      className={`mt-1 text-right text-[10px] ${
                        msg.sender === awareness.getLocalState()?.user?.name
                          ? "text-bg-deep opacity-70"
                          : "text-text-dim"
                      }`}
                    >
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-border bg-bg-panel p-3">
              <div className="flex items-center gap-2 rounded-full border border-border bg-bg-deep px-3 py-2">
                <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className="text-text-dim transition hover:text-accent"
                >
                  <Smile size={22} />
                </button>

                {showEmojiPicker && (
                  <div className="absolute bottom-12 left-0 z-50">
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      width={320}
                      height={380}
                    />
                  </div>
                )}
              </div>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      sendMessage();
                    }
                  }}
                  placeholder="Send a message..."
                  className="flex-1 bg-transparent text-sm outline-none text-text"
                />

                <button
                  onClick={sendMessage}
                  className="rounded-full bg-accent p-2 text-bg-deep transition hover:brightness-110"
                >
                  <SendHorizontal size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;