const express = require('express');
const router = express.Router();
const { register, verifyEmailOtp, resendOtp, loginUser, loginAdmin } = require('../controllers/authController');

router.post('/register', register);
router.post('/verify-otp', verifyEmailOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', loginUser);
router.post('/admin/login', loginAdmin);

module.exports = router;
