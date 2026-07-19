const languages = [
  { label: "JavaScript", value: "javascript" },
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
  { label: "C", value: "c" },
  { label: "C++", value: "cpp" },
  { label: "C#", value: "csharp" },
];

export default function LanguageSelector({ language, setLanguage }) {
  return (
    <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="px-3 py-2 rounded-lg bg-[#252836] border border-[#3b3f52] text-white outline-none cursor-pointer"
        >
      {languages.map((lang) => (
        <option key={lang.value} value={lang.value}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}