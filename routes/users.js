const express = require('express');
const router = express.Router();
const { userAuth } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');
const { uploadAvatar, uploadDoc } = require('../middleware/uploadMiddleware');

router.get('/me', userAuth, userController.getProfile);
router.put('/me', userAuth, userController.updateProfile);
router.post('/me/avatar', userAuth, uploadAvatar.single('avatar'), userController.uploadAvatar);
router.post('/me/verify-doc', userAuth, uploadDoc.single('doc'), userController.uploadVerificationDoc);

module.exports = router;
