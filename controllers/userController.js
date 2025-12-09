const User = require('../models/User');
const Notification = require('../models/Notification');
const { refreshWalletValues } = require("../utils/refreshWalletBalance");

const bcrypt = require("bcryptjs");

exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password').populate('notifications');
  await refreshWalletValues(user)
  res.json(user);
};

exports.updateProfile = async (req, res) => {
  const updates = {};
  ["firstName", "lastName", "email", "phone", "country", "address"].forEach(k => {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  });

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "Not found" });

  Object.assign(user, updates);

  await user.save();

  return res.json({ 
    success: true,
    message: "Profile updated successfully" 
  });
};


exports.uploadAvatar = async (req, res) => {
  if(!req.file) return res.status(400).json({ message: 'No file' });
  const user = req.user;
  user.avatar = `/uploads/avatars/${req.file.filename}`;
  await user.save();
  res.json({ message: 'Avatar uploaded', path: user.avatar });
};

exports.uploadVerificationDoc = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const user = req.user;

  user.verificationDoc = `/uploads/verification_docs/${req.file.filename}`;

  user.verificationStatus = "pending";

  await user.save();

  const n = new Notification({
    user: req.user._id, 
    isAdmin: true,
    title: 'User verification requested',
    body: `${user.firstName} ${user.lastName} submitted verification.`
  });
  await n.save();

  user.notifications.push(n._id);
  await user.save();

  res.json({
    message: 'Verification document uploaded successfully',
    verificationStatus: user.verificationStatus,
    verificationDoc: user.verificationDoc,
  });
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "User not found" });

    
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Old password is incorrect" });

    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;

    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
exports.getMyData = async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("firstName lastName email phone country address avatar verified verificationStatus");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(user);
};

