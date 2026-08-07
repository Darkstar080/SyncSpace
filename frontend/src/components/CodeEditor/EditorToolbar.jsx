import { FolderOpen, Save, Settings, Play, ChevronDown, FilePlus, Folder } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import EditorSettings from "./EditorSettings";



const EditorToolbar = ({ onRun,
  onSave,
  onNewFile,
  onOpenFile,
  onOpenSettings,
  editorSettings,
  setEditorSettings, }) => {
  const [showFileMenu, setShowFileMenu] = useState(false);
  const fileMenuRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);
  const settingsMenuRef = useRef(null);
//this is a useEffect hook that adds an event listener to the document to handle clicks outside of the file menu. When a click occurs outside of the file menu, it sets the showFileMenu state to false, effectively closing the menu. The event listener is cleaned up when the component unmounts to prevent memory leaks.
  useEffect(() => {
  function handleClickOutside(e) {
  

  if (
    settingsMenuRef.current &&
    !settingsMenuRef.current.contains(e.target)
  ) {
   
    setShowSettings(false);
  }

  if (
    fileMenuRef.current &&
    !fileMenuRef.current.contains(e.target)
  ) {
    setShowFileMenu(false);
  }
}

  document.addEventListener("mousedown", handleClickOutside);

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);
  return (
   <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">

            <div className="relative" ref={fileMenuRef}>
              <button
                onClick={() => setShowFileMenu(!showFileMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-bg-deep transition"
              >
                <FolderOpen size={18} className="text-yellow-400" />
                <span className="text-text">File</span>
                <ChevronDown size={16} className="text-text-dim" />
              </button>

              {showFileMenu && (
                <div
                 className="absolute left-0 mt-2 w-56 rounded-lg bg-bg-panel border border-border shadow-xl z-50 overflow-hidden"
                 >
                  <button
                            onClick={() => {
                              setShowFileMenu(false);
                              onNewFile();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-deep text-text transition"
                          >
                    <span>New File</span>
                  </button>

                  <button
                        onClick={() => {
                          setShowFileMenu(false);
                          onOpenFile();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-deep text-text transition"
                      >
                    <FolderOpen size={18} />
                    <span>Open File</span>
                  </button>

                  <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-deep text-text transition">
                    <Folder size={18} />
                    <span>Open Folder</span>
                  </button>
                </div>
                
              )}
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
      </div>

      <button 
      onClick={onRun}
      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md transition">
        <Play size={18} />
        <span>Run</span>
      </button>
    </div>
  );
};

export default EditorToolbar;