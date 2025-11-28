const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  fromAdmin: { type: Boolean, default: false },
  admin: { type: Schema.Types.ObjectId, ref: 'Admin' },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  text: String,
  sentAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

module.exports = mongoose.model('Message', MessageSchema);
