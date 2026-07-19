const OutputPanel = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
   <div className="h-full bg-bg-panel flex flex-col"
    style={{ height: "50%" }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="font-medium text-text">Output</span>

        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-lg"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 text-sm font-mono text-white">
        Output will appear here...
      </div>
    </div>
  );
};

export default OutputPanel;