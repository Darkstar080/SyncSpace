export async function askAI(prompt) {
  const response = await fetch("http://localhost:4000/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();
  return data;
}