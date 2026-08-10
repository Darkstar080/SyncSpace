import {
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  FilePlus,
  FolderPlus,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";

export default function FolderExplorer({
  files = [],
  onFileClick,
  onNewFile,
  onNewFolder,
  onRefresh,
  onRename,
  onDelete,
}) {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const toggleFolder = (item) => {
    setSelectedFolder(item.path);

    setExpandedFolders((prev) => ({
      ...prev,
      [item.path]: !prev[item.path],
    }));
  };

  const renderItems = (items, level = 0) => {
    return items.map((item) => {
      const isFolder = item.kind === "directory";
      const children = item.children || [];
      const isExpanded = expandedFolders[item.path];
      const isSelected = selectedFolder === item.path;

      return (
        <div key={item.path}>
          <div
            className={`flex items-center gap-1 px-2 py-1 text-sm cursor-pointer select-none ${
              isSelected
                ? "bg-bg-deep text-text"
                : "text-text-dim hover:bg-bg-deep"
            }`}
            style={{
              paddingLeft: `${8 + level * 16}px`,
            }}
            onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();

            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              item,
            });
          }}
            onClick={(event) => {
              event.stopPropagation();

              if (isFolder) {
                toggleFolder(item);
              } else {
                onFileClick?.(item);
              }
            }}
          >
            {/* Arrow */}
            {isFolder && children.length > 0 ? (
              isExpanded ? (
                <ChevronDown size={15} className="flex-shrink-0" />
              ) : (
                <ChevronRight size={15} className="flex-shrink-0" />
              )
            ) : (
              <span className="w-[15px] flex-shrink-0" />
            )}

            {/* Icon */}
            {isFolder ? (
              <Folder
                size={15}
                className="text-yellow-400 flex-shrink-0"
              />
            ) : (
              <File size={15} className="flex-shrink-0" />
            )}

            {/* Name */}
            <span className="truncate flex-1 min-w-0">
              {item.name}
            </span>

            {/* Actions only for selected folder */}
            {isFolder && isSelected && (
              <div
                className="flex items-center gap-0.5 flex-shrink-0"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  title="New File"
                  onClick={() => onNewFile?.(item)}
                  className="p-1 rounded hover:bg-gray-600"
                >
                  <FilePlus size={13} />
                </button>

                <button
                  title="New Folder"
                  onClick={() => onNewFolder?.(item)}
                  className="p-1 rounded hover:bg-gray-600"
                >
                  <FolderPlus size={13} />
                </button>

                <button
                  title="Refresh"
                  onClick={() => onRefresh?.(item)}
                  className="p-1 rounded hover:bg-gray-600"
                >
                  <RefreshCw size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Children */}
          {isFolder && isExpanded && children.length > 0 && (
            <div>
              {renderItems(children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

    return (
      <div
        className="w-full"
        onClick={() => setContextMenu(null)}
      >
        {renderItems(files)}

        {contextMenu && (
          <div
            className="fixed z-50 w-36 bg-bg-panel border border-border rounded-md shadow-lg py-1"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="w-full text-left px-3 py-2 text-sm text-text hover:bg-bg-deep"
              onClick={() => {
                onRename?.(contextMenu.item);
                setContextMenu(null);
              }}
            >
              Rename
            </button>

            <button
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-bg-deep"
              onClick={() => {
                onDelete?.(contextMenu.item);
                setContextMenu(null);
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    );
}