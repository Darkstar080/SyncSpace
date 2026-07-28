import { MessageCircle } from "lucide-react";

const ChatButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-bg-deep shadow-lg transition hover:scale-105 hover:brightness-110"
    >
      <MessageCircle size={26} />
    </button>
  );
};

export default ChatButton;