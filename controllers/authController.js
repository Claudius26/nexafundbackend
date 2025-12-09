const User = require('../models/User');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const genReferral = require('../utils/generateReferral');
const Notification = require('../models/Notification');
const Transaction = require('../models/Transaction');

const REFERRAL_CREDIT = Number(process.env.REFERRAL_CREDIT || 50);

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, address, country, password, confirmPassword, referralCode } = req.body;
    if (!firstName || !lastName || !email || !password || !confirmPassword)
      return res.status(400).json({ message: 'Missing required fields' });
    if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already used' });

    const passwordHash = await bcrypt.hash(password, 10);
    let userReferral = genReferral();
    while (await User.findOne({ referralCode: userReferral })) {
      userReferral = genReferral();
    }

    const supportedCoins = ['BTC', 'LTC', 'USDT', 'XRP', 'SOL', 'ETH'];
    const wallets = supportedCoins.map(coin => ({coin,amount:0,amountUsd: 0
    }));

    const newUser = new User({
      firstName,
      lastName,
      email,
      address,
      country,
      password: passwordHash,
      referralCode: userReferral,
      wallets
    });

    if (referralCode) {
      const referer = await User.findOne({ referralCode });
      if (referer) {
        referer.balance += REFERRAL_CREDIT;
        await referer.save();
        const t = new Transaction({ user: referer._id, type: 'referral_credit', amount: REFERRAL_CREDIT, status: 'confirmed' });
        await t.save();
        const n = new Notification({ user: referer._id, title: 'Referral credited', body: `You got $${REFERRAL_CREDIT} for referring a new user.` });
        await n.save();
        referer.notifications.push(n._id);
        await referer.save();
        newUser.balance += REFERRAL_CREDIT;
      }
      newUser.referredBy = referralCode;
    }

    await newUser.save();

    const token = jwt.sign({ id: newUser._id, role: 'user' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.status(201).json({ message: 'Registration Successful.', token, user: { id: newUser._id, email: newUser.email, firstName: newUser.firstName, lastName: newUser.lastName, wallets } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).populate("notifications");
    if (!user) return res.status(404).json({ message: 'User not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const safeUser = {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      address: user.address,
      country: user.country,
      phone: user.phone,
      avatar: user.avatar,
      verified: user.verified,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      balance: user.balance,
      gasFee: user.gasFee,
      wallets: user.wallets,
      isBlocked: user.isBlocked,
      verificationDoc: user.verificationDoc,
      verificationStatus: user.verificationStatus,
      createdAt: user.createdAt,
      notifications: user.notifications,
    };

    res.json({ token, user: safeUser });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.json({ token, admin: { id: admin._id, username: admin.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
