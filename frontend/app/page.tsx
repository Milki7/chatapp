"use client";
import { useState, useEffect, useRef } from "react";
import { Send, Menu, User, Image as ImageIcon, Mic } from "lucide-react";
import { socket } from "@/lib/socket";

interface Message {
  author: string;
  content: string;
  timestamp: string;
  isMe: boolean;
}

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket.connect();

    // Listen for incoming messages
    socket.on("receive_message", (data) => {
      setChat((prev) => [...prev, { ...data, isMe: false }]);
    });

    return () => { socket.off("receive_message"); };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const sendMessage = () => {
    if (message.trim()) {
      const messageData = {
        room: "general", // Hardcoded for now
        author: "You",   // We'll replace this with BetterAuth later
        content: message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      socket.emit("send_message", messageData);
      setChat((prev) => [...prev, { ...messageData, isMe: true }]);
      setMessage("");
    }
  };

  return (
    <div className="flex h-screen bg-light-blue overflow-hidden font-sans">
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden md:flex w-64 bg-dark-slate flex-col text-white">
        <div className="p-6 border-b border-white/10 text-active-blue font-bold text-xl">ChatApp</div>
        <div className="p-4"><div className="bg-primary/20 p-3 rounded-lg text-sm font-medium"># general</div></div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 bg-white/30 backdrop-blur-sm">
        {/* HEADER */}
        <header className="h-16 bg-white border-b flex items-center px-6 shadow-sm">
          <Menu className="md:hidden mr-4 text-dark-slate" />
          <h2 className="font-bold text-dark-slate">General Room</h2>
        </header>

        {/* MESSAGES */}
        <section className="flex-1 overflow-y-auto p-6 space-y-4">
          {chat.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm text-sm ${
                msg.isMe 
                ? "bg-active-blue text-white rounded-br-none" 
                : "bg-white text-dark-slate rounded-bl-none border border-light-blue"
              }`}>
                {!msg.isMe && <p className="text-[10px] font-bold text-primary mb-1">{msg.author}</p>}
                {msg.content}
              </div>
              <span className="text-[10px] text-primary mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))}
          <div ref={scrollRef} />
        </section>

        {/* INPUT */}
        <footer className="p-4 bg-white border-t">
          <div className="max-w-4xl mx-auto flex items-center gap-3 bg-light-blue/20 rounded-full px-4 py-2 border border-light-blue">
            <button className="text-primary hover:scale-110 transition-transform"><ImageIcon size={20}/></button>
            <input 
              type="text" 
              className="flex-1 bg-transparent outline-none text-dark-slate"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button 
              onClick={sendMessage}
              className="bg-active-blue text-white p-2 rounded-full hover:bg-primary transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}