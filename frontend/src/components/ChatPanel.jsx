import { Send } from "lucide-react";

export default function ChatPanel() {
  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>Chat</h3>
      </div>

      <div className="chat-body">
        <p>No messages yet.</p>
      </div>

      <div className="chat-input-container">
        <input
          type="text"
          placeholder="Type a message..."
          className="chat-input"
        />

        <button className="send-btn">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}