const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

exports.adminAuth = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if(!auth) return res.status(401).json({ message: 'No token' });
    const token = auth.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(payload.id);
    if(!admin) return res.status(401).json({ message: 'Admin not found' });
    req.admin = admin;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'Unauthorized admin' });
  }
};
