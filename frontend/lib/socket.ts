import { io } from "socket.io-client";

// This pulls from your .env file
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export const socket = io(SOCKET_URL, {
  autoConnect: false, // We'll connect manually when the chat loads
});