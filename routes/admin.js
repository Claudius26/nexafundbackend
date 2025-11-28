const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/adminMiddleware');
const adminCtrl = require('../controllers/adminController');

router.use(adminAuth);

router.get('/users', adminCtrl.listUsers);
router.get('/users/:id', adminCtrl.getUser);
router.post('/users/:id/verify', adminCtrl.verifyUser);
router.post('/transactions/:id/confirm-deposit', adminCtrl.confirmDeposit);
router.post('/transactions/:id/mark-paid', adminCtrl.confirmWithdrawalPaid);
router.post('/users/:id/increase-balance', adminCtrl.increaseBalance);
router.post('/users/:id/topup-gas', adminCtrl.topUpGas);
router.delete('/users/:id', adminCtrl.deleteUser);
router.post('/users/:id/block', adminCtrl.blockUser);
router.post('/users/:id/unblock', adminCtrl.unblockUser);


router.post('/chat/send', adminCtrl.sendMessageToUser);
router.get('/chat/:userId', adminCtrl.getMessagesWithUser);

module.exports = router;
