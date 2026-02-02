const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Import your schema
const Message = require('./models/Message'); 

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

  // JOIN ROOM & LOAD OLD MESSAGES
  socket.on("join_room", async (roomName) => {
    socket.join(roomName);
    console.log(`User ${socket.id} joined room: ${roomName}`);

    try {
      // Find the last 50 messages for this room from the database
      const previousMessages = await Message.find({ room: roomName })
        .sort({ timestamp: 1 }) // Order by time (oldest to newest)
        .limit(50);
      
      // Send the history ONLY to the user who just joined
      socket.emit("load_history", previousMessages);
    } catch (err) {
      console.error("Error loading history:", err);
    }
  });

  // SEND & SAVE MESSAGE
  socket.on("send_message", async (data) => {
    try {
      // Create a new message object based on your schema
      const newMessage = new Message({
        room: data.room,
        author: data.author,
        content: data.content,
        type: data.type || "text"
      });

      // Save it to MongoDB
      const savedMessage = await newMessage.save();

      // Broadcast the saved message (which now has an ID and timestamp) to the room
      io.to(data.room).emit("receive_message", savedMessage);
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  // TYPING INDICATOR
  socket.on("typing", (data) => {
    // Tells everyone in the room except the sender that someone is typing
    socket.to(data.room).emit("user_typing", { author: data.author });
  });

  socket.on("stop_typing", (data) => {
    socket.to(data.room).emit("user_stopped_typing");
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});