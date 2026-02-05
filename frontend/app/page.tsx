"use client";
import { useState, useEffect, useRef } from "react";
import { Send, Menu, User, Image as ImageIcon, Mic } from "lucide-react";
import { socket } from "@/lib/socket";

interface Message {
  _id?: string;
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

    // 1. Join the room immediately
    socket.emit("join_room", "general");

    // 2. Listen for chat history from DB
    socket.on("load_history", (history: any[]) => {
      const formattedHistory = history.map((msg) => ({
        ...msg,
        // If author is "You", we mark as isMe (Refine this once BetterAuth is added)
        isMe: msg.author === "You", 
        timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      setChat(formattedHistory);
    });

    // 3. Listen for new incoming messages
    socket.on("receive_message", (data) => {
      // Check if message is from me to avoid duplicates (since we emit to room)
      setChat((prev) => {
        // Simple check: if the last message has the same content and was sent within 1 sec, skip
        // This is a temporary fix until we have unique User IDs from BetterAuth
        return [...prev, { 
          ...data, 
          isMe: data.author === "You",
          timestamp: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }];
      });
    });

    return () => {
      socket.off("load_history");
      socket.off("receive_message");
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const sendMessage = () => {
    if (message.trim()) {
      const messageData = {
        room: "general",
        author: "You", // BetterAuth will replace this soon
        content: message,
      };

      // We ONLY emit. We let "receive_message" handle adding it to the UI
      // so the timestamp and ID match the database exactly.
      socket.emit("send_message", messageData);
      setMessage("");
    }
  };

  return (
    <div className="flex h-screen bg-light-blue overflow-hidden font-sans">
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden md:flex w-64 bg-dark-slate flex-col text-white">
        <div className="p-6 border-b border-white/10 text-active-blue font-bold text-xl tracking-tight">
          ChatApp
        </div>
        <div className="p-4 space-y-2">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider px-3 mb-2">Channels</p>
          <div className="bg-active-blue/20 text-active-blue p-3 rounded-xl text-sm font-medium cursor-pointer border border-active-blue/30">
            # general
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 bg-white/40 backdrop-blur-md">
        {/* HEADER */}
        <header className="h-16 bg-white/80 border-b flex items-center px-6 justify-between shadow-sm sticky top-0 z-10">
          <div className="flex items-center">
            <button className="md:hidden mr-4 text-dark-slate p-2 hover:bg-light-blue/20 rounded-lg">
              <Menu size={20} />
            </button>
            <div>
              <h2 className="font-bold text-dark-slate">General Room</h2>
              <p className="text-[10px] text-green-500 font-medium">● Online</p>
            </div>
          </div>
        </header>

        {/* MESSAGES AREA */}
        <section className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-primary/20">
          {chat.map((msg, i) => (
            <div key={msg._id || i} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
              <div className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"} max-w-[80%] md:max-w-[70%]`}>
                {!msg.isMe && (
                  <span className="text-xs font-semibold text-primary mb-1 ml-1">{msg.author}</span>
                )}
                <div className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed ${
                  msg.isMe 
                  ? "bg-active-blue text-white rounded-br-none" 
                  : "bg-white text-dark-slate rounded-bl-none border border-light-blue/50"
                }`}>
                  {msg.content}
                </div>
                <span className="text-[9px] text-primary/70 mt-1 font-medium px-1">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </section>

        {/* INPUT BAR */}
        <footer className="p-4 bg-white/80 border-t backdrop-blur-md">
          <div className="max-w-4xl mx-auto flex items-center gap-3 bg-light-blue/30 rounded-2xl px-4 py-2 border border-light-blue/50 focus-within:border-active-blue transition-all">
            <button className="text-primary hover:text-dark-slate transition-colors p-1">
              <ImageIcon size={20}/>
            </button>
            <input 
              type="text" 
              className="flex-1 bg-transparent outline-none text-dark-slate py-2 text-sm placeholder:text-primary/50"
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button className="text-primary hover:text-dark-slate transition-colors p-1 mr-1">
              <Mic size={20}/>
            </button>
            <button 
              onClick={sendMessage}
              className="bg-active-blue text-white p-2.5 rounded-xl hover:bg-primary transition-all shadow-md active:scale-95"
            >
              <Send size={18} />
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}