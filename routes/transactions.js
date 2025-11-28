const express = require('express');
const router = express.Router();
const { userAuth } = require('../middleware/authMiddleware');
const txnCtrl = require('../controllers/transactionController');
const upload = require('../middleware/uploadMiddleware');

router.post(
  '/deposit',
  userAuth,
  upload.uploadGiftcard.single('giftcardFile'), 
  txnCtrl.createDeposit
);


router.post('/withdraw', userAuth, txnCtrl.createWithdrawal);

router.get('/me', userAuth, txnCtrl.listUserTransactions);

module.exports = router;
