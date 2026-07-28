import { X, Sparkles } from "lucide-react";
import Draggable from "react-draggable";

const AIPanel = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <Draggable
      handle=".ai-header"
      defaultPosition={{
        x: window.innerWidth - 460,
        y: 120,
      }}
    >
      <div className="z-50 flex h-[550px] w-[400px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="ai-header flex cursor-move items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-accent" size={22} />
            <h2 className="text-lg font-semibold">AI Assistant</h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-md p-1 transition hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="text-center">
            <Sparkles
              size={42}
              className="mx-auto mb-4 text-accent"
            />

            <h3 className="text-lg font-semibold">
              AI Coding Assistant
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Copy some code or ask any coding question to get started.
            </p>
          </div>
        </div>
      </div>
    </Draggable>
  );
};

export default AIPanel;