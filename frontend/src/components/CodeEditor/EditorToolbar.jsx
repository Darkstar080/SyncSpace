import { FolderOpen, Save, Settings, Play, ChevronDown, FilePlus, Folder } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import LanguageSelector from "./LanguageSelector";


const EditorToolbar = ({ language, setLanguage, onRun,  onNewFile, onOpenFile,  }) => {
  const [showFileMenu, setShowFileMenu] = useState(false);
  const fileMenuRef = useRef(null);
//this is a useEffect hook that adds an event listener to the document to handle clicks outside of the file menu. When a click occurs outside of the file menu, it sets the showFileMenu state to false, effectively closing the menu. The event listener is cleaned up when the component unmounts to prevent memory leaks.
  useEffect(() => {
    function handleClickOutside(e) {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target)) {
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
        <LanguageSelector
            language={language}
            setLanguage={setLanguage}
            />

            <div className="relative" ref={fileMenuRef}>
              <button
                onClick={() => setShowFileMenu(!showFileMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-700 transition"
              >
                <FolderOpen size={18} className="text-yellow-400" />
                <span className="text-white">File</span>
                <ChevronDown size={16} className="text-gray-300" />
              </button>

              {showFileMenu && (
                <div className="absolute left-0 mt-2 w-56 rounded-lg bg-[#1f2335] border border-gray-700 shadow-xl z-50 overflow-hidden">
                  <button
                            onClick={() => {
                              setShowFileMenu(false);
                              onNewFile();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 text-white transition"
                          >
                    <span>New File</span>
                  </button>

                  <button
                        onClick={() => {
                          setShowFileMenu(false);
                          onOpenFile();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 text-white transition"
                      >
                    <FolderOpen size={18} />
                    <span>Open File</span>
                  </button>

                  <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 text-white transition">
                    <Folder size={18} />
                    <span>Open Folder</span>
                  </button>
                </div>
              )}
            </div>

        <button className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-700 transition">
          <Save size={18} className="text-blue-400" />
          <span className="text-white">Save</span>
        </button>

        <button className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-700 transition">
          <Settings size={18} className="text-gray-300" />
          <span className="text-white">Settings</span>
        </button>
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