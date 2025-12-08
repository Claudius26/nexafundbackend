const express = require('express');
const router = express.Router();
const path = require('path');
const cors = require('cors');

const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
};

router.use('/avatars', cors(corsOptions), express.static(path.join(__dirname, '..', 'uploads', 'avatars')));

router.use('/verification_docs', cors(corsOptions), express.static(path.join(__dirname, '..', 'uploads', 'verification_docs')));

router.use('/giftcards', cors(corsOptions), express.static(path.join(__dirname, '..', 'uploads', 'giftcards')));

module.exports = router;
