import { Folder, File, ChevronRight, ChevronDown } from "lucide-react";
import { useRef, useState, useEffect } from "react";

export default function FileExplorer() {
  const [expanded, setExpanded] = useState(true);
  const [width, setWidth] = useState(224);
  const isDragging = useRef(false);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!isDragging.current) return;

      const newWidth = event.clientX;

      if (newWidth >= 180 && newWidth <= 400) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;

      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div
      className="h-full flex flex-shrink-0 bg-bg-panel border-r border-border"
      style={{ width: `${width}px` }}
    >
      {/* Explorer content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Explorer Header */}
        <div className="h-10 flex items-center px-3 border-b border-border flex-shrink-0">
          <span className="text-xs font-semibold text-text">
            EXPLORER
          </span>
        </div>

        {/* Explorer Content */}
        <div className="flex-1 overflow-auto py-1">
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="w-full flex items-center gap-1 px-2 py-1 text-sm text-text hover:bg-bg-deep"
          >
            {expanded ? (
              <ChevronDown size={15} />
            ) : (
              <ChevronRight size={15} />
            )}

            <Folder size={16} className="text-yellow-400" />

            <span className="truncate">Project</span>
          </button>

          {expanded && (
            <div className="ml-5">
              <div className="flex items-center gap-2 px-2 py-1 text-sm text-text-dim hover:bg-bg-deep cursor-pointer">
                <File size={15} />
                <span>main.ts</span>
              </div>

              <div className="flex items-center gap-2 px-2 py-1 text-sm text-text-dim hover:bg-bg-deep cursor-pointer">
                <File size={15} />
                <span>App.jsx</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Draggable vertical divider */}
      <div
        onMouseDown={() => {
          isDragging.current = true;
          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";
        }}
        className="w-2 cursor-col-resize bg-gray-700 hover:bg-blue-500 transition-colors flex-shrink-0"
      >
        <div className="w-1 h-full mx-auto bg-gray-700 hover:bg-blue-500" />
      </div>
    </div>
  );
}