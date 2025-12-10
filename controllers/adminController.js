const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const Message = require('../models/Message');

const { getCryptoPrices } = require('../services/cryptoPrice');
const calculateBalance = require('../utils/calcBalance');

const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const { refreshWalletValues } = require("../utils/refreshWalletBalance");




exports.getAdminInfo = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select("-passwordHash"); 
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    res.json({
      _id: admin._id,
      username: admin.username,
      createdAt: admin.createdAt,
    });
  } catch (err) {
    console.error("getAdminInfo error:", err);
    res.status(500).json({ message: "Failed to fetch admin info" });
  }
};


exports.updateAdminUsername = async (req, res) => {
  try {
    const { username } = req.body;
    const adminId = req.admin._id;

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const existing = await Admin.findOne({ username });
    if (existing && existing._id.toString() !== adminId.toString()) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const updated = await Admin.findByIdAndUpdate(
      adminId,
      { username },
      { new: true }
    );

    res.json({
      message: "Username updated successfully",
      admin: { username: updated.username }
    });
  } catch (err) {
    console.error("updateAdminUsername:", err);
    res.status(500).json({ message: "Failed to update username" });
  }
};


exports.updateAdminPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const adminId = req.admin._id;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const match = await bcrypt.compare(oldPassword, admin.passwordHash);
    if (!match) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    admin.passwordHash = hashed;
    await admin.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("updateAdminPassword:", err);
    res.status(500).json({ message: "Failed to update password" });
  }
};


exports.listUsers = async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json(users);
};

exports.getUser = async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if(!user) return res.status(404).json({ message: 'Not found' });
  await refreshWalletValues(user)
  res.json(user);
};

exports.verifyUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.verified = true;
  user.verificationStatus = "verified";

  await user.save();
  const n = new Notification({
    user: user._id,
    title: 'Account verified',
    body: 'Your account has been verified by admin.',
  });
  await n.save();

  user.notifications.push(n._id);
  await user.save();

  res.json({ 
    message: 'User verified successfully', 
    verificationStatus: user.verificationStatus 
  });
};

exports.rejectUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

  
    user.verificationStatus = "not_submitted";
    user.verificationDoc = ""; 
    user.verified = false;

    await user.save();

  
    const n = new Notification({
      user: user._id,
      title: "Verification Rejected",
      body: "Your submitted document was rejected by admin. Please submit again."
    });
    await n.save();

    user.notifications.push(n._id);
    await user.save();

    res.json({ message: "User rejected successfully" });
  } catch (err) {
    console.error("rejectUser error:", err);
    res.status(500).json({ message: "Failed to reject user" });
  }
};

exports.confirmDeposit = async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    if (!txn) return res.status(404).json({ message: 'Transaction not found' });

    const user = await User.findById(txn.user);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let prices, coinData, usdPrice, cryptoAmount;

    if (txn.method === 'crypto') {
      prices = await getCryptoPrices();
      coinData = prices[txn.coin];

      if (!coinData?.price) {
        return res.status(400).json({ message: "Unsupported coin" });
      }

      usdPrice = coinData.price;
    }

    if (txn.purpose === 'gas') {
      user.gasFee +=txn.amount;
    }

    else {
      if (txn.method === 'crypto') {
        const usdAmount = Number(txn.amount);
        cryptoAmount = usdAmount / usdPrice;

        let wallet = user.wallets.find(w => w.coin === txn.coin);
        if (!wallet) {
          wallet = { coin: txn.coin, amount: 0,amountUsd: 0};
          user.wallets.push(wallet);
        }

        wallet.amount += cryptoAmount;
        wallet.amountUsd += txn.amount;
        txn.cryptoAmount = cryptoAmount;

        user.balance = calculateBalance(user.wallets, prices);
      }

      else if (txn.method === 'giftcard') {
        let wallet = user.wallets.find(w => w.coin === 'USDT');
        if (!wallet) {
          wallet = { coin: 'USDT', amount: 0,amountUsd:0 };
          user.wallets.push(wallet);
        }

        wallet.amountUsd += Number(txn.amount);
        user.balance = calculateBalance(user.wallets, { USDT: 1 });
      }
    }

    txn.status = 'confirmed';
    await txn.save();
    await refreshWalletValues(user);
    await user.save();

    await new Notification({
      user: user._id,
      title: 'Deposit confirmed',
      body: `Your deposit of $${txn.amount} has been confirmed by admin.`
    }).save();

    res.json({ message: 'Deposit confirmed', transaction: txn });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error confirming deposit' });
  }
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

    usdAmount = Number(amount) * prices[coin]; 
  }

  user.gasFee += usdAmount;
  await user.save();

  res.json({
    message: 'Gas topped up',
    amount: usdAmount,
    newGasFee: user.gasFee
  });
};


exports.confirmWithdrawalPaid = async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    if (!txn)
      return res.status(404).json({ message: 'Transaction not found' });

    if (txn.type !== 'withdrawal') {
      return res.status(400).json({ message: 'Transaction is not a withdrawal' });
    }

    if (txn.status !== 'pending') {
      return res.status(400).json({ message: 'Transaction already processed' });
    }

    const user = await User.findById(txn.user);
    if (!user)
      return res.status(404).json({ message: 'User not found' });

    if (txn.coin === 'USD') {
      if (user.balance < txn.amount) {
        return res.status(400).json({ message: 'Insufficient USD balance' });
      }

      user.balance -= txn.amount;
    }

    else {
      const wallet = user.wallets.find(w => w.coin === txn.coin);

      if (!wallet) {
        return res.status(400).json({ message: `User does not have a ${txn.coin} wallet` });
      }

      if (!txn.cryptoAmount || txn.cryptoAmount <= 0) {
        return res.status(400).json({ message: 'Invalid crypto withdrawal amount' });
      }


      if (wallet.amount < txn.cryptoAmount) {
        return res.status(400).json({ message: 'Insufficient crypto balance' });
      }
       if (wallet.amountUsd < txn.amount) {
        return res.status(400).json({ message: 'Insufficient crypto balance' });
      }

      wallet.amount -= txn.cryptoAmount;
      wallet.amountUsd -= txn.amount;
    }

    txn.status = 'paid';
    txn.paidAt = new Date();
    await txn.save();
    await refreshWalletValues(user);
    await user.save();

    await new Notification({
      user: user._id,
      title: 'Withdrawal Paid',
      body: `Your withdrawal of $${txn.cryptoAmount} ${txn.coin} to ${txn.walletAddress} has been completed.`
    }).save();

    res.json({ message: 'Withdrawal marked as paid successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error processing withdrawal' });
  }
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
  if (!coinPrice.price)
    return res.status(400).json({ message: "Unsupported coin" });



  const cryptoToAdd = Number(amount) / coinPrice.price;



  const wallet = user.wallets.find(w => w.coin === coin);
  if (!wallet) return res.status(400).json({ message: "Wallet missing for coin" });


  wallet.amount += cryptoToAdd;
  wallet.amountUsd += wallet.amount * coinPrice.price;

  
  user.balance = calculateBalance(user.wallets, prices);


  const txn = new Transaction({
    user: user._id,
    type: "admin_topup",
    amount: Number(amount),
    coin,
    cryptoAmount: cryptoToAdd,
    status: "confirmed"
  });
  await txn.save();
  await refreshWalletValues(user);
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
  await user.save();
  res.json({ message: 'Message sent' });
};

exports.getMessagesWithUser = async (req, res) => {
  const { userId } = req.params;
  const messages = await Message.find({ user: userId }).sort({ sentAt: 1 });
  res.json(messages);
};

exports.getAllTransactions = async (req, res) => {
  try {
    const txns = await Transaction.find()
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json(txns);
  } catch (err) {
    console.error("getAllTransactions:", err);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
};

