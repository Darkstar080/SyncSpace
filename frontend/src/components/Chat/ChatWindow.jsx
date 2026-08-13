import { useState, useRef, useEffect } from "react";
import {
  X,
  Minus,
  Smile,
  SendHorizontal,
  MessageCircle,
} from "lucide-react";
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

  const currentUser =
    awareness.getLocalState()?.user?.name;

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
        className={`flex flex-col overflow-hidden rounded-xl border border-[#cfd3da] bg-[#f4f5f7] shadow-2xl ${
          isMinimized
            ? "h-14 w-[380px]"
            : "h-[550px] w-[380px]"
        }`}
      >
        {/* Header */}
        <div
          onMouseDown={handleMouseDown}
          className="flex h-14 flex-shrink-0 cursor-move items-center justify-between border-b border-[#d7dae0] bg-[#ffffff] px-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef0f3]">
              <MessageCircle
                size={17}
                className="text-[#596273]"
              />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-[#252a34]">
                Chat
              </h2>

              <p className="text-[11px] text-[#7b8494]">
                Room Messages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onMinimize}
              title="Minimize"
              className="rounded-md p-1.5 text-[#737b89] transition hover:bg-[#eef0f3] hover:text-[#252a34]"
            >
              <Minus size={17} />
            </button>

            <button
              onClick={onClose}
              title="Close"
              className="rounded-md p-1.5 text-[#737b89] transition hover:bg-[#eef0f3] hover:text-[#252a34]"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 min-h-0 space-y-4 overflow-y-auto bg-[#f4f5f7] p-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8eaee]">
                      <MessageCircle
                        size={22}
                        className="text-[#737b89]"
                      />
                    </div>

                    <h3 className="text-sm font-medium text-[#343a46]">
                      No messages yet
                    </h3>

                    <p className="mt-1 text-xs text-[#858d9b]">
                      Start a conversation with your team.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => {
                    const isMine =
                      msg.sender === currentUser;

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${
                          isMine
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[75%] rounded-xl px-3.5 py-2.5 ${
                            isMine
                              ? "rounded-br-sm bg-accent text-bg-deep"
                              : "rounded-bl-sm border border-[#d8dbe1] bg-white text-[#303642]"
                          }`}
                        >
                          {!isMine && (
                            <p className="mb-1 text-[11px] font-medium text-[#697384]">
                              {msg.sender}
                            </p>
                          )}

                          <p className="break-words text-sm leading-5">
                            {msg.text}
                          </p>

                          <p
                            className={`mt-1 text-right text-[10px] ${
                              isMine
                                ? "text-bg-deep opacity-60"
                                : "text-[#8a92a0]"
                            }`}
                          >
                            {msg.time}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="flex-shrink-0 border-t border-[#d7dae0] bg-white p-3">
              <div className="relative flex items-center gap-2 rounded-lg border border-[#d1d5db] bg-[#f7f8fa] px-3 py-2 focus-within:border-[#aeb5c0]">
                <button
                  onClick={() =>
                    setShowEmojiPicker((prev) => !prev)
                  }
                  title="Emoji"
                  className="flex-shrink-0 rounded-md p-1 text-[#7b8494] transition hover:bg-[#e9ebef] hover:text-[#4f5868]"
                >
                  <Smile size={19} />
                </button>

                {showEmojiPicker && (
                  <div className="absolute bottom-14 left-0 z-50 overflow-hidden rounded-lg shadow-2xl">
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      width={320}
                      height={380}
                    />
                  </div>
                )}

                <input
                  type="text"
                  value={input}
                  onChange={(e) =>
                    setInput(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      sendMessage();
                    }
                  }}
                  placeholder="Send a message..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#303642] outline-none placeholder:text-[#9299a6]"
                />

                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  title="Send message"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-[#e8eaee] text-[#5e6675] transition hover:bg-[#dde0e5] hover:text-[#303642] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <SendHorizontal size={17} />
                </button>
              </div>

              <p className="mt-1.5 text-center text-[10px] text-[#9299a6]">
                Press Enter to send
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;