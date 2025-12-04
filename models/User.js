const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const supportedCrypto = ['SOL','BTC','USDT','LTC','XRP','ETH'];

const WalletSchema = new Schema({
  coin: { type: String, enum: supportedCrypto },
  amount: { type: Number, default: 0 }
}, { _id: false });

const UserSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  address: String,
  country: String,
  phone: String,
  avatar: String,
  verified: { type: Boolean, default: false },
  referralCode: { type: String, unique: true },
  referredBy: String,
  balance: { type: Number, default: 0 }, 
  gasFee: { type: Number, default: 0 },
  wallets: [WalletSchema],
  isBlocked: { type: Boolean, default: false },
  verificationDoc: String,
  verificationStatus: {
    type: String,
    enum: ["not_submitted", "pending", "verified"],
    default: "not_submitted",
  },
  createdAt: { type: Date, default: Date.now },
  notifications: [{ type: Schema.Types.ObjectId, ref: 'Notification' }]
});

module.exports = mongoose.model('User', UserSchema);
