import { useRef,useState,useEffect  } from 'react'
import Editor from '@monaco-editor/react'
import { MonacoBinding } from 'y-monaco'
import EditorToolbar from "./EditorToolbar";
import OutputPanel from "./OutputPanel";
import NewFileModal from "./NewFileModal";
import { saveFile } from "./saveFile";


export default function CodeEditor({ codeText, awareness, theme = 'dark', setSelectedCode, setShowSelectionAI,  setSelectionPosition,}) {
  const bindingRef = useRef(null)
  const editorRef = useRef(null);
  const fileInputRef = useRef(null)
  const [language, setLanguage] = useState("python")

  const [isOutputOpen, setIsOutputOpen] = useState(false);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [output, setOutput] = useState("");
 const [editorSettings, setEditorSettings] = useState(() => {
  const saved = localStorage.getItem("editorSettings");
  if (saved) {
    const parsed = JSON.parse(saved);
    // Migrate invalid 'vs-light' theme to correct 'vs' value
    if (parsed.theme === "vs-light") parsed.theme = "vs";
    return parsed;
  }
  return {
    theme: theme === 'dark' ? 'vs-dark' : 'vs',
    fontSize: 14,
    wordWrap: "off",
    minimap: false,
    lineNumbers: "on",
  };
});

// This useEffect hook saves the editor settings to localStorage whenever they change, ensuring that user preferences persist across sessions.
useEffect(() => {
  localStorage.setItem(
    "editorSettings",
    JSON.stringify(editorSettings)
  );
}, [editorSettings]);



  function handleMount(editor, monaco) {
    editorRef.current = editor;
  editor.onDidChangeCursorSelection(() => {
      const selection = editor.getSelection();

      const selectedText = editor
        .getModel()
        .getValueInRange(selection)
        .trim();

      setSelectedCode(selectedText);
      setShowSelectionAI(selectedText.length > 0);

      if (selectedText) {
        const pos = editor.getScrolledVisiblePosition(
          selection.getEndPosition()
        );

        if (pos) {
          const rect = editor.getDomNode().getBoundingClientRect();

          setSelectionPosition({
            x: rect.left + pos.left + 10,
            y: rect.top + pos.top - 35,
          });
        }
      }
    });
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

      const templates = {
      python: "# Start coding here\n\n",

      javascript: "// Start coding here\n\n",

      typescript: "// Start coding here\n\n",

      java: `// Start coding here

    public class Main {

    }
    `,

      cpp: `// Start coding here

    #include <iostream>
    using namespace std;

    int main() {

        return 0;
    }
    `,

      c: `// Start coding here

    #include <stdio.h>

    int main() {

        return 0;
    }
    `,
          };

        codeText.insert(0, templates[data.language] || "");

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

           function handleSave() {
              if (!currentFile) {
                alert("Please create or open a file first.");
                return;
              }

              saveFile(currentFile.name, codeText.toString());
            }
     // This function handles the "Run" button click event. It retrieves the current code from the editor, logs the selected language and code to the console, and opens the output panel. 
      async function handleRun() {
         if (!currentFile) {
        setIsOutputOpen(true);
        setOutput("Please create a new file or open an existing file first.");
        return;
      }

        const code = codeText.toString().trim();
        if (!code) {
          setIsOutputOpen(true);
          setOutput("The current file is empty.");
          return;
        }

        setIsOutputOpen(true);

        console.log("Sending Language:", language);
        console.log("Sending Code:", code);
        try {
          const response = await fetch("http://localhost:4000/run", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              language,
              code,
            }),
          });

          const data = await response.json();

          console.log("Response:", data);
          if (data.status === "success") {
              setOutput(data.output);
            } else {
              setOutput(data.error || "Execution failed.");
            }
        } catch (error) {
          console.error(error);
        }
      }

      
  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-panel/60 backdrop-blur-xl border-b border-border/50 flex-shrink-0 z-10">
        <div className="flex flex-col">
          <span className="font-medium text-sm text-text">
            {currentFile ? currentFile.name : "Code Editor"}
          </span>
          {currentFile && (
            <span className="text-[10px] text-accent/70 font-mono mt-0.5 uppercase tracking-wider">
              {currentFile.language}
            </span>
          )}
        </div>
        <EditorToolbar
          onRun={handleRun}
          onSave={handleSave}
          onNewFile={() => setShowNewFileModal(true)}
          onOpenFile={handleOpenFileClick}
          editorSettings={editorSettings}
          setEditorSettings={setEditorSettings}
        />
      </div>
                <div className="relative flex-1 min-h-0">
          <Editor
  height="100%"
  language={language}
  theme={editorSettings.theme}
  onMount={handleMount}
  options={{
    fontSize: editorSettings.fontSize,
    wordWrap: editorSettings.wordWrap,
    minimap: {
      enabled: editorSettings.minimap,
    },
    lineNumbers: editorSettings.lineNumbers,
  }}
/>

          {!currentFile && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-4xl mb-4">⌨️</p>
                <h2 className="text-lg font-semibold text-text mb-2">Welcome to SyncSpace</h2>
                <p className="text-sm text-text-dim max-w-xs leading-relaxed">
                  Create a <span className="text-accent font-medium">New File</span> or open an existing one from the toolbar to start coding.
                </p>
              </div>
            </div>
          )}
        </div>

        <OutputPanel
          isOpen={isOutputOpen}
          output={output}
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