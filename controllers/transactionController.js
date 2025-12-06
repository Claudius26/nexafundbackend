const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { getCryptoPrices } = require("../services/cryptoPrice");

const validNetworks = {
  USDT: ["TRC20", "ERC20", "BEP20"],
  ETH: ["ERC20"],
  BTC: ["Bitcoin"],
  SOL: ["Solana"],
  XRP: ["XRP"],
  LTC: ["Litecoin"]
};


exports.createDeposit = async (req, res) => {
  try {

    const { amount, coin, method, giftcardCode, purpose } = req.body;

    const user = req.user;

    if (user.isBlocked) {  
      return res.status(403).json({ message: 'User is blocked and cannot make withdrawals' });
    }

    let giftcardImage = null;

    if (!amount || !coin || !method) {
      return res.status(400).json({ message: 'Amount, coin, and method are required' });
    }

    if (method === 'giftcard') {
      if (req.file) giftcardImage = req.file.path || req.file.filename;
      else if (!giftcardCode) return res.status(400).json({ message: 'Provide either gift card file or code' });
    }

    const t = new Transaction({
      user: req.user._id,
      type: 'deposit',
      amount,
      coin,
      method,
      giftcardImage,
      giftcardCode: giftcardCode || null,
      status: 'pending',
      purpose: purpose || 'normal'
    });

    await t.save();

    const n = new Notification({
      user: req.user._id, 
      isAdmin: true,
      title: 'New deposit request',
      body: `User ${req.user.email} initiated a deposit of $${amount}.`
    });
    await n.save();

    res.json({ message: 'Deposit created, pending admin confirmation', transaction: t });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating deposit' });
  }
};


exports.createWithdrawal = async (req, res) => {
  try {
    const { amount, coin, walletAddress, network } = req.body;
    const user = req.user;

    if (user.isBlocked) {
      return res.status(403).json({ message: "User is blocked and cannot make withdrawals" });
    }

    if (!amount || !coin || !walletAddress || !network) {
      return res.status(400).json({ message: "Amount, coin, network and wallet address are required" });
    }

    if (!user.verified) {
      return res.status(403).json({ message: "User must be verified to be eligible for withdrawal" });
    }

    const wallet = user.wallets.find(w => w.coin === coin);
    if (!wallet) {
      return res.status(400).json({ message: `You do not have a ${coin} wallet` });
    }

    const coinData = await getCryptoPrices();
    const coinPrice = coinData[coin]?.price;
    
    if (!coinPrice || coinPrice <= 0) {
      return res.status(500).json({ message: "Unable to fetch crypto price" });
    }


    const cryptoAmountNeeded = amount / coinPrice;
    console.log(wallet.amount)
    console.log(cryptoAmountNeeded)

    if (wallet.amount < cryptoAmountNeeded) {
      return res.status(400).json({
        message: `Insufficient ${coin} balance. You need ${cryptoAmountNeeded.toFixed(6)} ${coin}.`
      });
    }

    if (!user.gasFee || user.gasFee < user.balance * 0.02) {
      return res.status(400).json({
        message: "Insufficient gas fee to complete the transaction request"
      });
    }

    if (!validNetworks[coin]?.includes(network)) {
      return res.status(400).json({ message: "Invalid network for selected coin" });
    }

    const t = new Transaction({
      user: user._id,
      type: "withdrawal",
      amountUSD: amount,
      amountCrypto: cryptoAmountNeeded,
      coin,
      walletAddress,
      network,
      status: "pending"
    });

    await t.save();

    const n = new Notification({
      user: user._id,
      isAdmin: true,
      title: "Withdrawal request",
      body: `User ${user.email} requested a withdrawal of $${amount}.`
    });

    await n.save();

    res.json({
      message: "Withdrawal requested, waiting admin confirmation",
      transaction: t
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error creating withdrawal" });
  }
};

exports.listUserTransactions = async (req, res) => {
  try {
    const txns = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(txns);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching transactions' });
  }
};
