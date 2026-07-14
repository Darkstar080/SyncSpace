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
    <div className="panel editor-panel">
      <div className="panel-header">
        <span>Code Editor</span>
      </div>
      <Editor
        height="520px"
        defaultLanguage="javascript"
        theme="vs-dark"
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
        }}
      />
    </div>
  )
}
