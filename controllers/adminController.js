const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const Message = require('../models/Message');

const { getCryptoPrices } = require('../services/cryptoPrice');
const calculateBalance = require('../utils/calcBalance');

exports.listUsers = async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json(users);
};

exports.getUser = async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if(!user) return res.status(404).json({ message: 'Not found' });
  res.json(user);
};

exports.verifyUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if(!user) return res.status(404).json({ message: 'Not found' });
  user.verified = true;
  await user.save();
  const n = new Notification({ user: user._id, title: 'Account verified', body: 'Your account has been verified by admin.' });
  await n.save();
  user.notifications.push(n._id);
  await user.save();
  res.json({ message: 'User verified' });
};

exports.confirmDeposit = async (req, res) => {
  const txn = await Transaction.findById(req.params.id);
  if(!txn) return res.status(404).json({ message: 'Transaction not found' });
  txn.status = 'confirmed';
  await txn.save();
  const user = await User.findById(txn.user);
  if(txn.method === 'crypto') {
    const prices = await getCryptoPrices();
    const coinPrice = prices[txn.coin];
    const wallet = user.wallets.find(w => w.coin === txn.coin);
    const cryptoAmount = Number(txn.amount) / coinPrice;
    wallet.amount += cryptoAmount;
    user.balance = calculateBalance(user.wallets, prices);
    txn.cryptoAmount = cryptoAmount;
    await txn.save();
  } else if(txn.method === 'giftcard') {
    const wallet = user.wallets.find(w => w.coin === 'USDT');
    wallet.amount += txn.amount;
    user.balance = calculateBalance(user.wallets, { USDT: 1 });
  }
  await user.save();
  const n = new Notification({ user: user._id, title: 'Deposit confirmed', body: `Your deposit of $${txn.amount} was confirmed.` });
  await n.save();
  user.notifications.push(n._id);
  await user.save();
  res.json({ message: 'Deposit confirmed', transaction: txn });
};

exports.topUpGas = async (req, res) => {
  const { amount, method, coin } = req.body;
  if (!amount) return res.status(400).json({ message: "amount required" });

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  let usdAmount = Number(amount);

  if (method === 'crypto') {
    if (!coin) return res.status(400).json({ message: "coin required for crypto method" });
    const prices = await getCryptoPrices();
    if (!prices || !prices[coin]) return res.status(400).json({ message: "unsupported coin" });

    usdAmount = Number(amount) * prices[coin]; // convert crypto to USD
  }

  user.gasFee += usdAmount;
  await user.save();

  const n = new Notification({
    user: user._id,
    title: 'Gas topped up',
    body: `Admin topped up your gas fee by ~$${usdAmount.toFixed(2)}${coin ? ` (${amount} ${coin})` : ''}.`
  });

  await n.save();
  user.notifications.push(n._id);
  await user.save();

  res.json({
    message: 'Gas topped up',
    amount: usdAmount,
    newGasFee: user.gasFee
  });
};

exports.confirmWithdrawalPaid = async (req, res) => {
  const txn = await Transaction.findById(req.params.id);
  if(!txn) return res.status(404).json({ message: 'Transaction not found' });
  txn.status = 'paid';
  txn.paidAt = new Date();
  await txn.save();
  const user = await User.findById(txn.user);
  const n = new Notification({ user: user._id, title: 'Withdrawal paid', body: `Your withdrawal of $${txn.amount} has been paid.`});
  await n.save();
  user.notifications.push(n._id);
  await user.save();
  res.json({ message: 'Marked as paid and user notified' });
};

exports.increaseBalance = async (req, res) => {
  const { coin, amount } = req.body;  

  if (!coin || !amount)
    return res.status(400).json({ message: "coin and amount (USD) required" });

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  
  const prices = await getCryptoPrices();
  if (!prices) return res.status(500).json({ message: "Price fetch failed" });

  const coinPrice = prices[coin];
  if (!coinPrice)
    return res.status(400).json({ message: "Unsupported coin" });

  const cryptoToAdd = Number(amount) / coinPrice;


  const wallet = user.wallets.find(w => w.coin === coin);
  if (!wallet) return res.status(400).json({ message: "Wallet missing for coin" });


  wallet.amount += cryptoToAdd;

  
  user.balance = calculateBalance(user.wallets, prices);

  await user.save();

  const txn = new Transaction({
    user: user._id,
    type: "admin_topup",
    amount: Number(amount),
    coin,
    cryptoAmount: cryptoToAdd,
    status: "confirmed"
  });
  await txn.save();

  const n = new Notification({
    user: user._id,
    title: "Balance Top-up",
    body: `Admin added ${cryptoToAdd.toFixed(8)} ${coin} (~$${amount}) to your wallet.`
  });

  await n.save();
  user.notifications.push(n._id);
  await user.save();

  
  res.json({
    message: "Wallet updated with crypto conversion",
    coin,
    addedUSD: Number(amount),
    addedCrypto: cryptoToAdd.toFixed(8),
    newCoinAmount: wallet.amount.toFixed(8),
    newUSDBalance: user.balance
  });
};

exports.deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
};

exports.blockUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  user.isBlocked = true;
  await user.save();
  res.json({ message: 'User blocked' });
};

exports.unblockUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  user.isBlocked = false;
  await user.save();
  res.json({ message: 'User unblocked' });
};


exports.sendMessageToUser = async (req, res) => {
  const { userId, text } = req.body;
  const m = new Message({ fromAdmin: true, admin: req.admin._id, user: userId, text });
  await m.save();
  
  const n = new Notification({ user: userId, title: 'Message from admin', body: text });
  await n.save();
  const user = await User.findById(userId);
  user.notifications.push(n._id);
  await user.save();
  res.json({ message: 'Message sent' });
};

exports.getMessagesWithUser = async (req, res) => {
  const { userId } = req.params;
  const messages = await Message.find({ user: userId }).sort({ sentAt: 1 });
  res.json(messages);
};
