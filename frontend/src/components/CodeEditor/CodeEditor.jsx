import { useRef,useState,useEffect  } from 'react'
import Editor from '@monaco-editor/react'
import { MonacoBinding } from 'y-monaco'
import EditorToolbar from "./EditorToolbar";
import OutputPanel from "./OutputPanel";
import NewFileModal from "./NewFileModal";
import { saveFile } from "./saveFile";
import WelcomeEditor from "./WelcomeEditor";
import FileExplorer from "./FileExplorer";


export default function CodeEditor({ codeText, awareness, theme = 'dark', setSelectedCode, setShowSelectionAI,  setSelectionPosition,}) {
  const bindingRef = useRef(null)
  const editorRef = useRef(null);
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)
  const [language, setLanguage] = useState("python")
  const [outputHeight, setOutputHeight] = useState(250);
  const [isDragging, setIsDragging] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [explorerRootHandle, setExplorerRootHandle] = useState(null);

  const [isOutputOpen, setIsOutputOpen] = useState(false);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [explorerFiles, setExplorerFiles] = useState([]);
  const [output, setOutput] = useState("");
 const [editorSettings, setEditorSettings] = useState(() => {
  const saved = localStorage.getItem("editorSettings");
  return saved
    ? JSON.parse(saved)
    : {
        theme:theme === 'dark' ? 'vs-dark' : 'vs',
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

useEffect(() => {
  function handleMouseMove(e) {
    if (!isDragging) return;

    const newHeight = window.innerHeight - e.clientY;

    if (newHeight > 120 && newHeight < 500) {
      setOutputHeight(newHeight);
    }
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);

  return () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };
}, [isDragging]);



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

    setExplorerFiles((prev) => [
      ...prev,
      {
        name: fileName,
        language: data.language,
      },
    ]);

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

      // This function handles the folder selection event, reads the content of the selected folder, and updates the explorer state accordingly.
      const handleExplorerFileClick = async (item) => {
  if (!item?.handle || item.kind !== "file") return;

  try {
    const file = await item.handle.getFile();
    const content = await file.text();

    const extensionMap = {
      js: "javascript",
      ts: "typescript",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
    };

    const extension = item.name.split(".").pop().toLowerCase();
    const detectedLanguage =
      extensionMap[extension] || "javascript";

    setCurrentFile({
      name: item.name,
      path: item.path,
      handle: item.handle,
      language: detectedLanguage,
    });

    setLanguage(detectedLanguage);

    codeText.delete(0, codeText.length);
    codeText.insert(0, content);
  } catch (error) {
    console.error("Failed to open explorer file:", error);
  }
};
// This function refreshes the explorer view by reading the contents of the currently opened folder and updating the state accordingly.
     async function handleFolderSelect() {
  try {
    const directoryHandle = await window.showDirectoryPicker({
      mode: "readwrite",
    });

    setExplorerRootHandle(directoryHandle);

    const readDirectory = async (directory, parentPath = "") => {
      const items = [];

      for await (const [name, handle] of directory.entries()) {
        const path = parentPath
          ? `${parentPath}/${name}`
          : name;

        if (handle.kind === "directory") {
          items.push({
            name,
            path,
            kind: "directory",
            handle,
            parentHandle: directory,
            children: await readDirectory(handle, path),
          });
        } else {
          items.push({
            name,
            path,
            kind: "file",
            handle,
            parentHandle: directory,
          });
        }
      }

      return items.sort((a, b) => {
        if (a.kind !== b.kind) {
          return a.kind === "directory" ? -1 : 1;
        }

        return a.name.localeCompare(b.name);
      });
    };

    const children = await readDirectory(directoryHandle);

    setExplorerFiles([
      {
        name: directoryHandle.name,
        path: directoryHandle.name,
        kind: "directory",
        handle: directoryHandle,
        children,
      },
    ]);
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Failed to open folder:", error);
    }
  }
}

    async function handleRenameExplorerItem(item) {
  if (!item?.handle || !item?.parentHandle) {
    alert("This item cannot be renamed.");
    return;
  }

  const newName = prompt("Enter new name:", item.name);

  if (!newName || newName === item.name) return;

  try {
    // Check whether the new name already exists
    try {
      if (item.kind === "file") {
        await item.parentHandle.getFileHandle(newName);
      } else {
        await item.parentHandle.getDirectoryHandle(newName);
      }

      alert("An item with that name already exists.");
      return;
    } catch {
      // Name does not exist — continue
    }

    if (item.kind === "file") {
      const oldFile = await item.handle.getFile();
      const newFile = await item.parentHandle.getFileHandle(
        newName,
        { create: true }
      );

      const writable = await newFile.createWritable();
      await writable.write(await oldFile.arrayBuffer());
      await writable.close();

      await item.parentHandle.removeEntry(item.name);
    } else {
      const newFolder =
        await item.parentHandle.getDirectoryHandle(
          newName,
          { create: true }
        );

      const copyDirectory = async (source, destination) => {
        for await (const [name, handle] of source.entries()) {
          if (handle.kind === "file") {
            const file = await handle.getFile();
            const newFile =
              await destination.getFileHandle(name, {
                create: true,
              });

            const writable = await newFile.createWritable();
            await writable.write(await file.arrayBuffer());
            await writable.close();
          } else {
            const newSubFolder =
              await destination.getDirectoryHandle(name, {
                create: true,
              });

            await copyDirectory(handle, newSubFolder);
          }
        }
      };

      await copyDirectory(item.handle, newFolder);

      await item.parentHandle.removeEntry(item.name, {
        recursive: true,
      });
    }

    await refreshExplorer();
  } catch (error) {
    console.error("Failed to rename:", error);
    alert("Rename failed.");
  }
}

    async function handleDeleteExplorerItem(item) {
      if (!item?.handle || !item?.parentHandle) {
        alert("This item cannot be deleted.");
        return;
      }

  const confirmed = window.confirm(
    `Delete "${item.name}"?`
  );

  if (!confirmed) return;

  try {
    await item.parentHandle.removeEntry(item.name, {
      recursive: item.kind === "directory",
    });

    await refreshExplorer();
  } catch (error) {
    console.error("Failed to delete:", error);
    alert("Delete failed.");
  }
}

  async function refreshExplorer() {
  if (!explorerRootHandle) return;

  const readDirectory = async (directory, parentPath = "") => {
    const items = [];

    for await (const [name, handle] of directory.entries()) {
      const path = parentPath
        ? `${parentPath}/${name}`
        : name;

      if (handle.kind === "directory") {
        items.push({
          name,
          path,
          kind: "directory",
          handle,
          parentHandle: directory,
          children: await readDirectory(handle, path),
        });
      } else {
        items.push({
          name,
          path,
          kind: "file",
          handle,
          parentHandle: directory,
        });
      }
    }

    return items.sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === "directory" ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    });
  };

  const children = await readDirectory(explorerRootHandle);

  setExplorerFiles([
    {
      name: explorerRootHandle.name,
      path: explorerRootHandle.name,
      kind: "directory",
      handle: explorerRootHandle,
      children,
    },
  ]);
}

    async function handleCreateExplorerFile(parentFolder = null) {
      const targetFolder = parentFolder?.handle || explorerRootHandle;

      if (!targetFolder) {
        alert("Please open a folder first.");
        return;
      }

      const fileName = prompt("Enter file name:");
      if (!fileName) return;

      try {
        await targetFolder.getFileHandle(fileName, {
          create: true,
        });

        await refreshExplorer();
      } catch (error) {
        console.error("Failed to create file:", error);
      }
    }

    async function handleCreateExplorerFolder(parentFolder = null) {
      const targetFolder = parentFolder?.handle || explorerRootHandle;

      if (!targetFolder) {
        alert("Please open a folder first.");
        return;
      }

      const folderName = prompt("Enter folder name:");
      if (!folderName) return;

      try {
        await targetFolder.getDirectoryHandle(folderName, {
          create: true,
        });

        await refreshExplorer();
      } catch (error) {
        console.error("Failed to create folder:", error);
      }
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
        setIsRunning(true);
        setOutput("");

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

          if (data.status === "success") {
            setOutput(
              `${data.output}\n\n✓ Process finished successfully`
            );
          } else {
            setOutput(
              `${data.error || "Execution failed."}\n\n✗ Process failed`
            );
          }
        } catch (error) {
          console.error(error);
          setOutput(
            "Failed to connect to execution server.\n\n✗ Process failed"
          );
        } finally {
          setIsRunning(false);
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
                onToggleExplorer={() => setShowFileExplorer((prev) => !prev)}
                editorSettings={editorSettings}
                setEditorSettings={setEditorSettings}
              />
        </div>
              <div className="relative flex-1 min-h-0 h-full overflow-hidden flex">
                {showFileExplorer && (
             <FileExplorer
                files={explorerFiles}
                onNewFile={handleCreateExplorerFile}
                onNewFolder={handleCreateExplorerFolder}
                onOpenFile={handleOpenFileClick}
                onOpenFolder={handleFolderSelect}
                onFileClick={handleExplorerFileClick}
                onRefresh={refreshExplorer}
                onRename={handleRenameExplorerItem}
                onDelete={handleDeleteExplorerItem}
              />
                )}
            <div className="relative flex-1 min-w-0 h-full overflow-hidden">
            {currentFile ? (
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
                  ) : (
                <WelcomeEditor
                  onNewFile={() => setShowNewFileModal(true)}
                  onOpenFile={handleOpenFileClick}
                />
              )}
            </div>
            </div>
       <>
       
          {isOutputOpen && (
            <div
              onMouseDown={() => setIsDragging(true)}
              className="h-2 cursor-row-resize bg-gray-700 hover:bg-blue-500 transition"
            />
          )}

        <OutputPanel
          isOpen={isOutputOpen}
          output={output}
          height={outputHeight}
          onClose={() => setIsOutputOpen(false)}
          onClear={() => setOutput("")}
        />
        </>
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
        <input
        type="file"
        ref={folderInputRef}
        className="hidden"
        webkitdirectory="true"
        directory="true"
        onChange={handleFolderSelect}
      />
    </div>
  )
}