const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  image: { type: String }, // Avatar URL from Google/Apple or Upload
  bio: { type: String, default: "" },
  
  // Status/Online Presence logic
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  
  // BetterAuth specifically requires these fields to manage sessions
  emailVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);