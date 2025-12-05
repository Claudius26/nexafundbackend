const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');

async function seedAdminIfNeeded() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if(!username || !password) {
    console.warn('ADMIN_USERNAME or ADMIN_PASSWORD not set in .env; skipping admin seed.');
    return;
  }
  const existing = await Admin.findOne({ username });
  if(existing) return;
  const hash = await bcrypt.hash(password, 10);
  const admin = new Admin({ username, passwordHash: hash });
  await admin.save();
  console.log('Seeded admin user:', username);
}

module.exports = seedAdminIfNeeded;
