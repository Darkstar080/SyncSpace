import { useRef,useState,useEffect  } from 'react'
import Editor from '@monaco-editor/react'
import { MonacoBinding } from 'y-monaco'
import EditorToolbar from "./EditorToolbar";
import OutputPanel from "./OutputPanel";
import NewFileModal from "./NewFileModal";
import { saveFile } from "./saveFile";


export default function CodeEditor({ codeText, awareness }) {
  const bindingRef = useRef(null)
  const fileInputRef = useRef(null)
  const [language, setLanguage] = useState("python")
  const [isOutputOpen, setIsOutputOpen] = useState(false);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [output, setOutput] = useState("");
 const [editorSettings, setEditorSettings] = useState(() => {
  const saved = localStorage.getItem("editorSettings");
  return saved
    ? JSON.parse(saved)
    : {
        theme: "vs-dark",
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
      if (codeText.length === 0) {
    codeText.insert(
      0,
      `# Welcome to SyncSpace

      # Create a new file or open an existing file from the File menu.
      # Then click Run to execute your code.
      `
        );
      }
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
          python:
        `# Welcome to SyncSpace
        # Create/Open a file and click Run to execute your code.

        `,

          java:
        `// Welcome to SyncSpace
        // Create/Open a file and click Run to execute your code.

        public class Main {

        }
        `,

          cpp:
        `// Welcome to SyncSpace
        // Create/Open a file and click Run to execute your code.

        #include <iostream>
        using namespace std;

        int main() {

            return 0;
        }
        `,

          c:
        `// Welcome to SyncSpace
        // Create/Open a file and click Run to execute your code.

        #include <stdio.h>

        int main() {

            return 0;
        }
        `,

          typescript:
        `// Welcome to SyncSpace
        // Create/Open a file and click Run to execute your code.

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
      
      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-panel border-b border-border flex-shrink-0">
        <div className="flex flex-col">
          <span className="font-medium text-text">
            {currentFile ? currentFile.name : "Code Editor"}
          </span>

          {currentFile && (
            <span className="text-xs text-gray-400">
              {currentFile.language.toUpperCase()}
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
        <div className="flex-1 min-h-0">
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