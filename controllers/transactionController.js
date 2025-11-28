const Transaction = require('../models/Transaction');
const User = require('../models/User');

exports.createDeposit = async (req, res) => {
  try {
    const { amount, coin, method, giftcardCode } = req.body;
    let giftcardImage = null;

    if (!amount || !coin || !method) {
      return res.status(400).json({ message: 'Amount, coin, and method are required' });
    }

    if (method === 'giftcard') {
      if (req.file) {
        giftcardImage = req.file.path || req.file.filename;
      } else if (!giftcardCode) {
        return res.status(400).json({ message: 'Provide either gift card file or code' });
      }
    }

    const t = new Transaction({
      user: req.user._id,
      type: 'deposit',
      amount,
      coin,
      method,
      giftcardImage,
      giftcardCode: giftcardCode || null,
      status: 'pending'
    });

    await t.save();
    res.json({ message: 'Deposit created, pending admin confirmation', transaction: t });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating deposit' });
  }
};

exports.createWithdrawal = async (req, res) => {
  try {
    const { amount, coin, walletAddress } = req.body;
    const user = req.user;

    if (!amount || !coin || !walletAddress) {
      return res.status(400).json({ message: 'Amount, coin, and wallet address are required' });
    }

    // if (user.balance < amount) {
    //   return res.status(400).json({ message: 'Insufficient funds' });
    // }

    const t = new Transaction({
      user: user._id,
      type: 'withdrawal',
      amount,
      coin,
      walletAddress, 
      status: 'pending',
    });

    await t.save();
    res.json({ message: 'Withdrawal requested, waiting admin confirmation', transaction: t });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating withdrawal' });
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
