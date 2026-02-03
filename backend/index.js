const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Import both schemas
const Message = require('./models/Message'); 
const User = require('./models/User'); // Added User model

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// 1. Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Database Connected"))
  .catch((err) => console.error("❌ DB Connection Error:", err));

// 2. The Socket Logic
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // --- ONLINE STATUS LOGIC ---
  socket.on("user_online", async (userId) => {
    socket.userId = userId; // Attach userId to the socket session
    try {
      await User.findByIdAndUpdate(userId, { 
        isOnline: true, 
        lastSeen: new Date() 
      });
      // Notify others this user is online
      socket.broadcast.emit("user_status_change", { userId, status: "online" });
    } catch (err) {
      console.error("Error updating online status:", err);
    }
  });

  // --- ROOMS & HISTORY ---
  socket.on("join_room", async (roomName) => {
    socket.join(roomName);
    console.log(`User ${socket.id} joined room: ${roomName}`);

    try {
      const previousMessages = await Message.find({ room: roomName })
        .sort({ timestamp: 1 })
        .limit(50);
      
      socket.emit("load_history", previousMessages);
    } catch (err) {
      console.error("Error loading history:", err);
    }
  });

  // --- MESSAGING ---
  socket.on("send_message", async (data) => {
    try {
      const newMessage = new Message({
        room: data.room,
        author: data.author, // This will be the User's name or ID
        content: data.content,
        type: data.type || "text"
      });

      const savedMessage = await newMessage.save();

      // Emit to everyone in the room (including sender)
      io.to(data.room).emit("receive_message", savedMessage);
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  // --- TYPING INDICATORS ---
  socket.on("typing", (data) => {
    socket.to(data.room).emit("user_typing", { author: data.author });
  });

  socket.on("stop_typing", (data) => {
    socket.to(data.room).emit("user_stopped_typing");
  });

  // --- DISCONNECT ---
  socket.on("disconnect", async () => {
    console.log("User Disconnected", socket.id);
    if (socket.userId) {
      try {
        await User.findByIdAndUpdate(socket.userId, { 
          isOnline: false, 
          lastSeen: new Date() 
        });
        socket.broadcast.emit("user_status_change", { 
          userId: socket.userId, 
          status: "offline" 
        });
      } catch (err) {
        console.error("Error updating offline status:", err);
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});