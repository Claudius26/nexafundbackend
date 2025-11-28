const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['deposit','withdrawal','admin_topup','referral_credit'], required: true },
  amount: { type: Number, required: true },
  coin: { type: String, default: 'USD' },
  method: { type: String, enum: ['crypto','giftcard'], default: 'crypto' },
  giftcardImage: String,
  giftcardCode: String,
  status: { type: String, enum: ['pending','confirmed','paid','rejected'], default: 'pending' },
  adminNote: String,
  createdAt: { type: Date, default: Date.now },
  paidAt: Date,
  cryptoAmount: Number,
  purpose: { type: String, enum: ['normal','gas'], default: 'normal' } 
});

module.exports = mongoose.model('Transaction', TransactionSchema);
