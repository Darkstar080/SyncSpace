export default function EditorSettings({ open, editorSettings, setEditorSettings, }) {
  if (!open) return null;

  return (
    <div className="absolute right-0 top-12 w-64 rounded-lg bg-[#1f2335] border border-gray-700 shadow-xl z-50 overflow-hidden">

      <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-700">
        <span className="text-white">Theme</span>

        <select
          value={editorSettings.theme}
          onChange={(e) =>
            setEditorSettings({
              ...editorSettings,
              theme: e.target.value,
            })
          }
          className="bg-[#2b3045] text-white rounded px-2 py-1 outline-none"
        >
          <option value="vs-dark">VS Dark</option>
          <option value="vs-light">VS Light</option>
          <option value="hc-black">High Contrast</option>
        </select>
      </div>

      <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-700">
        <span className="text-white">Font Size</span>

        <select
          value={editorSettings.fontSize}
          onChange={(e) =>
            setEditorSettings({
              ...editorSettings,
              fontSize: Number(e.target.value),
            })
          }
          className="bg-[#2b3045] text-white rounded px-2 py-1 outline-none"
        >
          <option value={12}>12</option>
          <option value={14}>14</option>
          <option value={16}>16</option>
          <option value={18}>18</option>
          <option value={20}>20</option>
          <option value={22}>22</option>
        </select>
      </div>

      <div
          onClick={() =>
            setEditorSettings({
              ...editorSettings,
              wordWrap: editorSettings.wordWrap === "on" ? "off" : "on",
            })
          }
          className="flex items-center justify-between px-4 py-3 hover:bg-gray-700 cursor-pointer"
        >
          <span className="text-white">Word Wrap</span>

          <span
            className={`text-sm font-medium ${
              editorSettings.wordWrap === "on"
                ? "text-green-400"
                : "text-gray-400"
            }`}
          >
            {editorSettings.wordWrap === "on" ? "ON" : "OFF"}
          </span>
        </div>

      <div
        onClick={() =>
          setEditorSettings({
            ...editorSettings,
            minimap: !editorSettings.minimap,
          })
        }
        className="flex items-center justify-between px-4 py-3 hover:bg-gray-700 cursor-pointer"
      >
        <span className="text-white">Minimap</span>

        <span
          className={`text-sm font-medium ${
            editorSettings.minimap
              ? "text-green-400"
              : "text-gray-400"
          }`}
        >
          {editorSettings.minimap ? "ON" : "OFF"}
        </span>
      </div>

      <div
          onClick={() =>
            setEditorSettings({
              ...editorSettings,
              lineNumbers:
                editorSettings.lineNumbers === "on" ? "off" : "on",
            })
          }
          className="flex items-center justify-between px-4 py-3 hover:bg-gray-700 cursor-pointer"
        >
          <span className="text-white">Line Numbers</span>

          <span
            className={`text-sm font-medium ${
              editorSettings.lineNumbers === "on"
                ? "text-green-400"
                : "text-gray-400"
            }`}
          >
            {editorSettings.lineNumbers === "on" ? "ON" : "OFF"}
          </span>
        </div>

    </div>
  );
}