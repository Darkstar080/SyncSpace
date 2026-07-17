import { useRef } from 'react'
import Editor from '@monaco-editor/react'
import { MonacoBinding } from 'y-monaco'

export default function CodeEditor({ codeText, awareness }) {
  const bindingRef = useRef(null)

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

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-panel border-b border-border text-sm text-text-dim flex-shrink-0">
        <span className="font-medium text-text">Code Editor</span>
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
          }}
        />
      </div>
    </div>
  )
}