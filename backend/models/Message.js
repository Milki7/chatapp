const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  room: { type: String, required: true },
  author: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, default: "text" }, // text, image, or audio
  timestamp: { type: Date, default: Date.now },
  delivered: { type: Boolean, default: false }
});

// MAKE SURE IT SAYS THIS:
module.exports = mongoose.model('Message', MessageSchema);
