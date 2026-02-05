const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const Message = require('./models/Message'); 
const User = require('./models/User');

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json()); // Essential for future API routes

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// --- MONGODB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Database Connected"))
  .catch((err) => console.error("❌ DB Connection Error:", err));

// --- SOCKET LOGIC ---
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. Online Status
  socket.on("user_online", async (userId) => {
    if (!userId) return;
    socket.userId = userId;
    try {
      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
      socket.broadcast.emit("user_status_change", { userId, status: "online" });
    } catch (err) {
      console.error("Error updating online status:", err);
    }
  });

  // 2. Joining Rooms & Loading History
  socket.on("join_room", async (roomName) => {
    socket.join(roomName);
    console.log(`User ${socket.id} joined room: ${roomName}`);

    try {
      const history = await Message.find({ room: roomName })
        .sort({ timestamp: 1 })
        .limit(50);
      socket.emit("load_history", history);
    } catch (err) {
      console.error("Error loading history:", err);
    }
  });

  // 3. Messaging (Now sending to room specifically)
  socket.on("send_message", async (data) => {
    try {
      const newMessage = new Message({
        room: data.room || "general",
        author: data.author,
        content: data.content,
      });

      const savedMessage = await newMessage.save();

      // Emit to everyone in the room (including sender)
      io.to(data.room || "general").emit("receive_message", savedMessage);
      
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  // 4. Typing Indicators
  socket.on("typing", (data) => {
    socket.to(data.room).emit("user_typing", { author: data.author });
  });

  socket.on("stop_typing", (data) => {
    socket.to(data.room).emit("user_stopped_typing");
  });

  // 5. Disconnect
  socket.on("disconnect", async () => {
    console.log("User Disconnected", socket.id);
    if (socket.userId) {
      try {
        await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() });
        socket.broadcast.emit("user_status_change", { userId: socket.userId, status: "offline" });
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