import { FolderOpen, Save, Settings, Play, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import EditorSettings from "./EditorSettings";

const EditorToolbar = ({
  onRun,
  onSave,
  onNewFile,
  onOpenFile,
  onOpenSettings,
  onToggleExplorer,
  editorSettings,
  setEditorSettings,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const settingsMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(e.target)
      ) {
        setShowSettings(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={onToggleExplorer}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-bg-deep transition"
          >
            <FolderOpen size={18} className="text-yellow-400" />
            <span className="text-text">File</span>
         
          </button>
        </div>

        <button
          onClick={onSave}
          className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-bg-deep transition"
        >
          <Save size={18} className="text-blue-400" />
          <span className="text-text">Save</span>
        </button>

        <div className="relative" ref={settingsMenuRef}>
          <button
            onClick={() => setShowSettings((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-bg-deep transition"
          >
            <Settings size={18} className="text-text-dim" />
            <span className="text-text">Settings</span>
            <ChevronDown size={16} className="text-text-dim" />
          </button>

          <EditorSettings
            open={showSettings}
            editorSettings={editorSettings}
            setEditorSettings={setEditorSettings}
          />
        </div>

        <button
          onClick={onRun}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md transition"
        >
          <Play size={18} />
          <span>Run</span>
        </button>
      </div>
    </>
  );
};

export default EditorToolbar;