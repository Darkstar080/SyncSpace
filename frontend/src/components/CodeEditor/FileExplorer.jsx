import { Folder, File } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import FolderExplorer from "./FolderExplorer";

export default function FileExplorer({
  files,
  onNewFile,
  onNewFolder,
  onOpenFile,
  onOpenFolder,
  onFileClick,
  onRefresh,
  onRename,
  onDelete,
}) {
  const [width, setWidth] = useState(224);

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(224);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!isDragging.current) return;

      const delta = event.clientX - dragStartX.current;
      const newWidth = dragStartWidth.current + delta;

      if (newWidth >= 80 && newWidth <= 400) {
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
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Explorer Header */}
        <div className="h-10 flex items-center px-3 border-b border-border flex-shrink-0">
          <span className="text-xs font-semibold text-text">
            EXPLORER
          </span>
        </div>

        {/* File Actions */}
        <div className="p-2 border-b border-border space-y-1">

          {/* New File */}
          <button
            onClick={onNewFile}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-text hover:bg-bg-deep rounded"
          >
            <File size={15} />
            <span>New File</span>
          </button>

          {/* Open File */}
          <button
            onClick={onOpenFile}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-text hover:bg-bg-deep rounded"
          >
            <File size={15} />
            <span>Open File</span>
          </button>

          {/* Open Folder */}
          <button
            onClick={onOpenFolder}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-text hover:bg-bg-deep rounded"
          >
            <Folder size={15} className="text-yellow-400" />
            <span>Open Folder</span>
          </button>
        </div>

        {/* Folder Tree */}
        <div className="flex-1 overflow-auto py-1">
          <FolderExplorer
            files={files}
            onFileClick={onFileClick}
            onNewFile={onNewFile}
            onNewFolder={onNewFolder}
            onRefresh={onRefresh}
            onRename={onRename}
            onDelete={onDelete}
          />
        </div>
      </div>

      {/* Draggable divider */}
      <div
        onMouseDown={(event) => {
          isDragging.current = true;
          dragStartX.current = event.clientX;
          dragStartWidth.current = width;

          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";
        }}
        className="w-3 cursor-col-resize bg-gray-700/50 hover:bg-blue-500 transition-colors flex-shrink-0"
      >
        <div className="w-1 h-full mx-auto bg-gray-700 hover:bg-blue-500" />
      </div>
    </div>
  );
}