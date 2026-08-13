import { useState, useRef, useEffect } from "react";
import {
  X,
  Sparkles,
  Send,
  Bot,
  User,
} from "lucide-react";
import { askAI } from "../../lib/ai";

const AIPanel = ({
  isOpen,
  onClose,
  aiPrompt,
  setAiPrompt,
}) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!aiPrompt.trim() || loading) return;

    console.log("AI Prompt:", aiPrompt);
    const userMessage = aiPrompt;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: userMessage },
    ]);

    setAiPrompt("");
    setLoading(true);

    try {
      const result = await askAI(userMessage);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: result.response,
        },
      ]);
    } catch (err) {
      console.error(err);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`absolute inset-0 z-40 flex flex-col bg-[#0f1117] text-white transition-all duration-300 ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-[#252936] bg-[#151821] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
            <Sparkles size={17} className="text-accent" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">
              AI Assistant
            </h2>
            <p className="text-[11px] text-gray-500">
              Coding assistant
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-[#242833] transition"
          title="Close AI Assistant"
        >
          <X size={18} />
        </button>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md px-5">
              <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                <Sparkles size={28} className="text-accent" />
              </div>

              <h2 className="text-xl font-semibold text-white">
                AI Coding Assistant
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Ask questions, debug code, or get help with
                programming concepts.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-2 text-left">
                <div className="rounded-lg border border-[#252936] bg-[#151821] px-3 py-2.5">
                  <p className="text-xs text-gray-300">
                    💡 Explain code
                  </p>
                </div>

                <div className="rounded-lg border border-[#252936] bg-[#151821] px-3 py-2.5">
                  <p className="text-xs text-gray-300">
                    🐛 Find a bug
                  </p>
                </div>

                <div className="rounded-lg border border-[#252936] bg-[#151821] px-3 py-2.5">
                  <p className="text-xs text-gray-300">
                    ⚡ Improve code
                  </p>
                </div>

                <div className="rounded-lg border border-[#252936] bg-[#151821] px-3 py-2.5">
                  <p className="text-xs text-gray-300">
                    📚 Learn concepts
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-5">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  msg.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                {/* AI Icon */}
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 mt-1 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
                    <Bot size={15} className="text-accent" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] ${
                    msg.role === "user"
                      ? "bg-accent text-bg-deep rounded-2xl rounded-br-md"
                      : "bg-[#191d27] border border-[#292e3a] text-gray-200 rounded-2xl rounded-bl-md"
                  } px-4 py-3`}
                >
                  <pre
                    className={`whitespace-pre-wrap break-words font-sans text-sm leading-6 ${
                      msg.role === "user"
                        ? "text-bg-deep"
                        : "text-gray-200"
                    }`}
                  >
                    {msg.text}
                  </pre>
                </div>

                {/* User Icon */}
                {msg.role === "user" && (
                  <div className="w-7 h-7 mt-1 rounded-lg bg-[#252936] flex items-center justify-center flex-shrink-0">
                    <User size={15} className="text-gray-400" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
                  <Bot size={15} className="text-accent" />
                </div>

                <div className="bg-[#191d27] border border-[#292e3a] rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[#252936] bg-[#151821] p-3 flex-shrink-0">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-end gap-2 rounded-xl border border-[#303542] bg-[#0f1117] p-2 focus-within:border-accent/60 transition">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && handleSend()
              }
              placeholder="Ask AI anything..."
              className="flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder:text-gray-600 outline-none"
            />

            <button
              onClick={handleSend}
              disabled={loading || !aiPrompt.trim()}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent text-bg-deep hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Send"
            >
              <Send size={16} />
            </button>
          </div>

          <p className="text-[10px] text-gray-600 text-center mt-2">
            AI can make mistakes. Review generated code before using it.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIPanel;