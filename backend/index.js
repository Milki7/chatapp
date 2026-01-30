const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors()); // Allows our Next.js frontend to connect

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // The URL of your Next.js app
    methods: ["GET", "POST"],
  },
});

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // 1. Listen for when a user joins
  socket.on("join_room", (data) => {
    socket.join(data); // "data" will be the room name (e.g., "General")
    console.log(`User with ID: ${socket.id} joined room: ${data}`);
  });

  // 2. Listen for a message
  socket.on("send_message", (messageData) => {
    // messageData will look like: { room: "General", author: "John", message: "Hello", time: "12:00" }
    
    // Send the message only to the people in that specific room
    socket.to(messageData.room).emit("receive_message", messageData);
    
    // Note: Use io.to(room).emit if you want the sender to receive it back too
  });

  socket.on('disconnect', () => {
    console.log('User Disconnected', socket.id);
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});