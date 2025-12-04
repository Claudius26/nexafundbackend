const express = require('express');
const router = express.Router();
const { register, loginUser, loginAdmin } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', loginUser);
router.post('/admin/login', loginAdmin);

module.exports = router;
