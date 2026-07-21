export default function EditorSettings({ open }) {
  if (!open) return null;

  return (
    <div className="absolute right-0 top-12 w-64 rounded-lg bg-[#1f2335] border border-gray-700 shadow-xl z-50 overflow-hidden">

      <button className="w-full text-left px-4 py-3 hover:bg-gray-700 text-white">
        Theme
      </button>

      <button className="w-full text-left px-4 py-3 hover:bg-gray-700 text-white">
        Font Size
      </button>

      <button className="w-full text-left px-4 py-3 hover:bg-gray-700 text-white">
        Word Wrap
      </button>

      <button className="w-full text-left px-4 py-3 hover:bg-gray-700 text-white">
        Minimap
      </button>

      <button className="w-full text-left px-4 py-3 hover:bg-gray-700 text-white">
        Line Numbers
      </button>

    </div>
  );
}