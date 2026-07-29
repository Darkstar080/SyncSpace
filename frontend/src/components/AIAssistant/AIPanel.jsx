import { useState, useRef, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { askAI } from "../../lib/ai";


const AIPanel = ({ isOpen, onClose }) => {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);


  useEffect(() => {
  messagesEndRef.current?.scrollIntoView({
    behavior: "smooth",
  });
}, [messages, loading]);

  const handleSend = async () => {
    if (!prompt.trim() || loading) return;

    const userMessage = prompt;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: userMessage },
    ]);

    setPrompt("");
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
      className={`absolute inset-0 z-40 flex flex-col bg-white transition-all duration-300 ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6">
        <div className="flex items-center gap-2">
          <Sparkles size={22} className="text-accent" />
          <h2 className="text-lg font-semibold">AI Assistant</h2>
        </div>

        <button
          onClick={onClose}
          className="rounded-md p-2 hover:bg-gray-100"
        >
          <X size={20} />
        </button>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-3xl text-center">
            <Sparkles size={52} className="mx-auto mb-5 text-accent" />

            <h2 className="text-2xl font-bold">
              AI Coding Assistant
            </h2>

            <p className="mt-3 text-gray-500">
              Copy code or ask any programming question to get started.
            </p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[80%] rounded-xl px-4 py-3 ${
                  msg.role === "user"
                    ? "ml-auto bg-accent text-bg-deep"
                    : "mr-auto bg-gray-100 text-gray-900"
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans">
                  {msg.text}
                </pre>
              </div>
            ))}

            {loading && (
              <div className="mr-auto rounded-xl bg-gray-100 px-4 py-3">
                Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask AI anything..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
          />

          <button
            onClick={handleSend}
            disabled={loading}
            className="rounded-lg bg-accent px-6 py-3 font-medium text-bg-deep hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIPanel;