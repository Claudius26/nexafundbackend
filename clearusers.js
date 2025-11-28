require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const Notification = require('./models/Notification');

const connectDB = require('./config/db');

const resetDB = async () => {
  await connectDB(process.env.MONGO_URI);

  await Transaction.deleteMany({});
  await Notification.deleteMany({});
  await User.deleteMany({});

  console.log('Database cleared: Users, Transactions, Notifications removed.');
  process.exit(0);
};

resetDB();
