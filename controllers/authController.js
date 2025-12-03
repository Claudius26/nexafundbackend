const User = require('../models/User');
const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const genReferral = require('../utils/generateReferral');
const { sendEmail } = require('../utils/email');
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
    const wallets = supportedCoins.map(coin => ({ coin, balance: 0 }));

    const newUser = new User({
      firstName,
      lastName,
      email,
      address,
      country,
      password: passwordHash,
      referralCode: userReferral,
      wallets,
      emailVerified: false
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    newUser.otp = { code: otp, expires: new Date(Date.now() + 15 * 60 * 1000) };
    await newUser.save();
    sendEmail(newUser.email, 'Verify your email', `Your OTP is ${otp}`, `<p>Your OTP is <b>${otp}</b></p>`).catch(console.error);

    const token = jwt.sign({ id: newUser._id, role: 'user' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.status(201).json({ message: 'Registered successfully. Please verify your email.', token, user: { id: newUser._id, email: newUser.email, firstName: newUser.firstName, lastName: newUser.lastName, emailVerified: false, wallets } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.verifyEmailOtp = async (req, res) => {
  
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.otp) return res.status(400).json({ message: 'OTP not found. Request a new code.' });
    if (user.otp.expires < new Date()) return res.status(400).json({ message: 'OTP expired. Request a new code.' });
    if (user.otp.code !== otp) return res.status(400).json({ message: 'Invalid OTP' });

    user.emailVerified = true;
    user.otp = null;
    await user.save();
    res.json({ message: 'Email verified successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = { code: otp, expires: new Date(Date.now() + 15 * 60 * 1000) };
    await user.save();
    sendEmail(user.email, 'Your new OTP', `Your OTP is ${otp}`, `<p>Your OTP is <b>${otp}</b></p>`).catch(console.error);
    res.json({ message: 'OTP sent to your email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: 'user' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.json({ token, user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, emailVerified: user.emailVerified, wallets: user.wallets } });
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
