import { ChatInterface } from "@/components/ChatInterface";
import Navbar from "@/components/Navbar";

const Chat = () => {
  return (
    <div className="h-screen bg-background flex flex-col">
      <Navbar />

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
};

export default Chat;