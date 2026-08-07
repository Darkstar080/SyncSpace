import { Terminal, X, Trash2 } from "lucide-react";

const OutputPanel = ({
  isOpen,
  onClose,
  output,
  height,
  onClear,
}) => {
  if (!isOpen) return null;

  const isError =
    output?.toLowerCase().includes("error") ||
    output?.toLowerCase().includes("failed");

  return (
    <div
      className="h-full flex flex-col bg-[#0d1117] border-t border-gray-700"
      style={{ height }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Terminal size={18} className="text-green-400" />
          <span className="text-white font-semibold">TERMINAL</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="flex items-center gap-1 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs transition"
          >
            <Trash2 size={14} />
            Clear
          </button>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-400 transition"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-auto p-4 font-mono text-sm whitespace-pre-wrap">
        {!output ? (
          <span className="text-gray-500">
            Ready... Click <b>Run</b> to execute your code.
          </span>
        ) : (
          <pre className={isError ? "text-red-400" : "text-green-400"}>
            {output}
          </pre>
        )}
      </div>
    </div>
  );
};

export default OutputPanel;