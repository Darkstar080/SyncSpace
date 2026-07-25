import { useRef } from "react";
import Draggable from "react-draggable";
import { X, Smile, SendHorizontal } from "lucide-react";

const ChatWindow = ({ isOpen, onClose }) => {
  const nodeRef = useRef(null);

  if (!isOpen) return null;

  return (
    <Draggable handle=".chat-header" nodeRef={nodeRef}>
      <div
        ref={nodeRef}
        className="fixed bottom-24 right-6 z-50 flex h-[550px] w-[380px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="chat-header flex cursor-move items-center justify-between border-b bg-blue-600 px-5 py-4 text-white">
          <div>
            <h2 className="text-lg font-semibold">Chat</h2>
            <p className="text-xs text-blue-100">Room Messages</p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1 transition hover:bg-blue-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4">
          {/* Receiver */}
          <div className="flex justify-start">
            <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-gray-200 px-4 py-3">
              <p className="text-xs font-semibold text-blue-600">Aman</p>
              <p className="mt-1 text-sm text-gray-800">Hello 👋</p>
              <p className="mt-1 text-right text-[10px] text-gray-500">
                10:20 PM
              </p>
            </div>
          </div>

          {/* Sender */}
          <div className="flex justify-end">
            <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-blue-600 px-4 py-3 text-white">
              <p className="text-sm">Hi 😄</p>
              <p className="mt-1 text-right text-[10px] text-blue-100">
                10:21 PM
              </p>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="border-t bg-white p-3">
          <div className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2">
            <button className="text-gray-500 transition hover:text-yellow-500">
              <Smile size={22} />
            </button>

            <input
              type="text"
              placeholder="Send a message"
              className="flex-1 bg-transparent text-sm outline-none"
            />

            <button className="rounded-full bg-blue-600 p-2 text-white transition hover:bg-blue-700">
              <SendHorizontal size={18} />
            </button>
          </div>
        </div>
      </div>
    </Draggable>
  );
};

export default ChatWindow;