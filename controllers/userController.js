const User = require('../models/User');
const Notification = require('../models/Notification');

exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password').populate('notifications');
  res.json(user);
};

exports.updateProfile = async (req, res) => {
  const updates = {};
  ['firstName','lastName','email','phone'].forEach(k => {
    if(req.body[k]) updates[k] = req.body[k];
  });
  
  const user = await User.findById(req.user._id);
  if(!user) return res.status(404).json({ message: 'Not found' });

  if(updates.email && updates.email !== user.email) {
    const otp = Math.floor(100000 + Math.random()*900000).toString();
    user.otp = { code: otp, expires: new Date(Date.now() + 1000*60*15) };
    await user.save();
    await require('../utils/email').sendEmail(updates.email, 'Email change OTP', `Your OTP is ${otp}`, `<p>OTP: ${otp}</p>`);
    user.email = updates.email;
    user.emailVerified = false;
  }
  ['firstName','lastName','phone'].forEach(f => {
    if(req.body[f]) user[f] = req.body[f];
  });
  await user.save();
  res.json({ message: 'Profile updated' });
};

exports.uploadAvatar = async (req, res) => {
  if(!req.file) return res.status(400).json({ message: 'No file' });
  const user = req.user;
  user.avatar = `/uploads/avatars/${req.file.filename}`;
  await user.save();
  res.json({ message: 'Avatar uploaded', path: user.avatar });
};

exports.uploadVerificationDoc = async (req, res) => {
  if(!req.file) return res.status(400).json({ message: 'No file' });
  const user = req.user;
  user.verificationDoc = `/uploads/verification_docs/${req.file.filename}`;
  await user.save();
  
  const Notification = require('../models/Notification');
  const n = new Notification({ title: 'User verification requested', body: `${user.firstName} ${user.lastName} submitted verification.`, user: user._id });
  await n.save();
  user.notifications.push(n._id);
  await user.save();
  res.json({ message: 'Verification doc uploaded' });
};
