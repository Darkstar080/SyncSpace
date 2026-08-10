import {
  Folder,
  File,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

export default function FolderExplorer({
  files = [],
  onFileClick,
}) {
  const [expandedFolders, setExpandedFolders] = useState({});

  const toggleFolder = (path) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const renderItems = (items, level = 0) => {
    return items.map((item) => {
      const isFolder = item.kind === "directory";
      const children = item.children || [];
      const isExpanded = expandedFolders[item.path];

      return (
        <div key={item.path}>
          <div
            onClick={(event) => {
              event.stopPropagation();

              if (isFolder) {
                toggleFolder(item.path);
              } else {
                onFileClick?.(item);
              }
            }}
            className="flex items-center gap-1 px-2 py-1 text-sm text-text-dim hover:bg-bg-deep cursor-pointer select-none"
            style={{
              paddingLeft: `${8 + level * 16}px`,
            }}
          >
            {/* Arrow */}
            {isFolder && children.length > 0 ? (
              isExpanded ? (
                <ChevronDown size={15} />
              ) : (
                <ChevronRight size={15} />
              )
            ) : (
              <span className="w-[15px]" />
            )}

            {/* Icon */}
            {isFolder ? (
              <Folder
                size={15}
                className="text-yellow-400 flex-shrink-0"
              />
            ) : (
              <File
                size={15}
                className="flex-shrink-0"
              />
            )}

            {/* Name */}
            <span className="truncate">
              {item.name}
            </span>
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
    <div className="w-full">
      {renderItems(files)}
    </div>
  );
}