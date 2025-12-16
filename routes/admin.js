const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/adminMiddleware');
const adminCtrl = require('../controllers/adminController');

router.use(adminAuth);


router.get("/me", adminAuth, adminCtrl.getAdminInfo);
router.get('/users', adminCtrl.listUsers);
router.get('/users/:id', adminCtrl.getUser);
router.post('/users/:id/verify', adminCtrl.verifyUser);
router.post('/users/:id/reject', adminCtrl.rejectUser);
router.post('/transactions/:id/confirm-deposit', adminCtrl.confirmDeposit);
router.post('/transactions/:id/mark-paid', adminCtrl.confirmWithdrawalPaid);
router.post('/users/:id/increase-balance', adminCtrl.increaseBalance);
router.post('/users/:id/topup-gas', adminCtrl.topUpGas);
router.post('/users/:id/deduct-gas', adminCtrl.deductGas);
router.delete('/users/:id', adminCtrl.deleteUser);
router.post('/users/:id/block', adminCtrl.blockUser);
router.post('/users/:id/unblock', adminCtrl.unblockUser);

router.put("/update-username", adminAuth, adminCtrl.updateAdminUsername);

router.put("/update-password", adminAuth, adminCtrl.updateAdminPassword);


router.post('/chat/send', adminCtrl.sendMessageToUser);
router.get('/chat/:userId', adminCtrl.getMessagesWithUser);
router.get('/transactions', adminCtrl.getAllTransactions);


module.exports = router;
