import { useRef,useState } from 'react'
import Editor from '@monaco-editor/react'
import { MonacoBinding } from 'y-monaco'
import EditorToolbar from "./EditorToolbar";
import OutputPanel from "./OutputPanel";
import NewFileModal from "./NewFileModal";



export default function CodeEditor({ codeText, awareness }) {
  const bindingRef = useRef(null)
  const fileInputRef = useRef(null)
  const [language, setLanguage] = useState("javascript")
  const [isOutputOpen, setIsOutputOpen] = useState(false);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);


  function handleMount(editor) {
    const model = editor.getModel()
   

    // This one line is what makes typing collaborative: it keeps the
    // Monaco text model and the shared Y.Text in sync in both
    // directions, including per-user selection highlighting via
    // awareness.
    bindingRef.current = new MonacoBinding(
      codeText,
      model,
      new Set([editor]),
      awareness
    )
  }

   function handleCreateFile(data) {
   const extensionMap = {
        javascript: ".js",
        typescript: ".ts",
        python: ".py",
        java: ".java",
        cpp: ".cpp",
        c: ".c",
      };

      const fileName = data.fileName + extensionMap[data.language];

      setCurrentFile({
        name: fileName,
        language: data.language,
      });

      setLanguage(data.language);

      // Clear the collaborative editor
      codeText.delete(0, codeText.length);

      setShowNewFileModal(false);

      console.log("Created:", fileName);
    }

    // This function triggers the hidden file input when the "Open File" button is clicked.
    function handleOpenFileClick() {
      fileInputRef.current?.click();
    }

    // This function handles the file selection event, reads the content of the selected file, and updates the editor state accordingly.
    async function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        const content = await file.text();
        const extensionMap = {
          js: "javascript",
          ts: "typescript",
          py: "python",
          java: "java",
          cpp: "cpp",
          c: "c",
        };

        const extension = file.name.split(".").pop().toLowerCase();
        const detectedLanguage = extensionMap[extension] || "javascript";
        setCurrentFile({
          name: file.name,
          language: detectedLanguage,
        });
        setLanguage(detectedLanguage);
        codeText.delete(0, codeText.length);
        codeText.insert(0, content);
        event.target.value = "";
      }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      
      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-panel border-b border-border flex-shrink-0">
     <span className="font-medium text-text">
          {currentFile ? currentFile.name : "Code Editor"}
        </span>
          <EditorToolbar
              language={language}
              setLanguage={setLanguage}
              onRun={() => setIsOutputOpen(true)}
              onNewFile={() => setShowNewFileModal(true)}
              onOpenFile={handleOpenFileClick}
          />
        </div>
        <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              onMount={handleMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
              }}
            />
        </div>

        <OutputPanel
          isOpen={isOutputOpen}
          onClose={() => setIsOutputOpen(false)}
        />
        <NewFileModal
          open={showNewFileModal}
          onClose={() => setShowNewFileModal(false)}
          onCreate={handleCreateFile}
        />
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".js,.ts,.py,.java,.cpp,.c,.txt"
          onChange={handleFileSelect}
        />
    </div>
  )
}