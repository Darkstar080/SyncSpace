export function saveFile(fileName, content) {
  if (!fileName) {
    alert("Please create or open a file first.");
    return;
  }

  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  });

  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;

  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}