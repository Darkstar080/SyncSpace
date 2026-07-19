import { useState } from "react";
import { X } from "lucide-react";

const LANGUAGES = [
  { label: "JavaScript", value: "javascript", extension: ".js" },
  { label: "TypeScript", value: "typescript", extension: ".ts" },
  { label: "Python", value: "python", extension: ".py" },
  { label: "Java", value: "java", extension: ".java" },
  { label: "C++", value: "cpp", extension: ".cpp" },
  { label: "C", value: "c", extension: ".c" },
];

export default function NewFileModal({ open, onClose, onCreate }) {
  const [fileName, setFileName] = useState("main");
  const [language, setLanguage] = useState("javascript");

  if (!open) return null;

  const handleCreate = () => {
    onCreate({
      fileName,
      language,
    });

    setFileName("main");
    setLanguage("javascript");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-[420px] rounded-xl bg-[#1f2335] border border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            New File
          </h2>

          <button onClick={onClose}>
            <X className="text-gray-400 hover:text-white" size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">

          <div>
            <label className="block text-sm text-gray-300 mb-2">
              File Name
            </label>

            <input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full rounded-md bg-[#2b3047] border border-gray-600 px-3 py-2 text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Language
            </label>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-md bg-[#2b3047] border border-gray-600 px-3 py-2 text-white outline-none focus:border-blue-500"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white"
          >
            Cancel
          </button>

          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}