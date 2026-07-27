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

  // ------------------------
  // Drag State
  // ------------------------
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

  // ------------------------
  // Messages
  // ------------------------


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

  // ------------------------
  // Drag Functions
  // ------------------------
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
  // ------------------------
  // Send Message
  // ------------------------
 const sendMessage = () => {
  if (!input.trim()) return;

  const user =
    awareness.getLocalState()?.user || {
      name: "Anonymous",
    };

    console.log("Before push:", chatMessages.toArray());
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
console.log("After push:", chatMessages.toArray());

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
        className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all duration-300 ${
          isMinimized ? "h-16 w-[380px]" : "h-[550px] w-[380px]"
        }`}
      >
        {/* ================= HEADER ================= */}
        <div
          onMouseDown={handleMouseDown}
          className="flex cursor-move items-center justify-between bg-blue-600 px-5 py-4 text-white"
        >
          <div>
            <h2 className="text-lg font-semibold">Chat</h2>
            <p className="text-xs text-blue-100">
              Room Messages
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onMinimize}
              className="rounded-full p-1 transition hover:bg-blue-700"
            >
              <Minus size={18} />
            </button>

            <button
              onClick={onClose}
              className="rounded-full p-1 transition hover:bg-blue-700"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* ================= MESSAGES ================= */}
            <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4 h-[410px]">
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
                        ? "rounded-br-sm bg-blue-600 text-white"
                        : "rounded-bl-sm bg-gray-200 text-gray-800"
                    }`}
                  >
                    {msg.sender !== awareness.getLocalState()?.user?.name && (
                      <p className="text-xs font-semibold text-blue-600">
                        {msg.sender}
                      </p>
                    )}

                    <p className="mt-1 text-sm">
                      {msg.text}
                    </p>

                    <p
                      className={`mt-1 text-right text-[10px] ${
                        msg.sender === awareness.getLocalState()?.user?.name
                          ? "text-blue-100"
                          : "text-gray-500"
                      }`}
                    >
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            {/* ================= INPUT ================= */}
            <div className="border-t bg-white p-3">
              <div className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2">
                <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className="text-gray-500 transition hover:text-yellow-500"
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
                  className="flex-1 bg-transparent text-sm outline-none"
                />

                <button
                  onClick={sendMessage}
                  className="rounded-full bg-blue-600 p-2 text-white transition hover:bg-blue-700"
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