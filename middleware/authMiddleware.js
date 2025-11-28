const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = process.env;

exports.userAuth = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if(!auth) return res.status(401).json({ message: 'No token' });
    const token = auth.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if(!user) return res.status(401).json({ message: 'User not found' });
    if(user.isBlocked) return res.status(403).json({ message: 'User is blocked' });
    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
