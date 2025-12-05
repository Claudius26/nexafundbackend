const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificatioController');

const { userAuth } = require('../middleware/authMiddleware');
const { adminAuth } = require('../middleware/adminMiddleware');

router.get('/admin', adminAuth, notificationController.getAdminNotifications);
router.put('/admin/:id/read', adminAuth, notificationController.markAdminNotificationAsRead);
router.put('/admin/mark-all-read', adminAuth, notificationController.markAllAdminNotificationsAsRead);
router.get('/admin/user/:userId', adminAuth, notificationController.getAdminNotificationsByUser);


router.get('/', userAuth, notificationController.getUserNotifications);
router.put('/:id/read', userAuth, notificationController.markNotificationAsRead);
router.put('/mark-all-read', userAuth, notificationController.markAllNotificationsAsRead);




module.exports = router;
