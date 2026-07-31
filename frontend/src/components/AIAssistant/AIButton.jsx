import { Bot } from "lucide-react";

const AIButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-bg-deep shadow-lg transition hover:scale-105 hover:brightness-110"
    >
      <Bot size={26} />
    </button>
  );
};

export default AIButton;