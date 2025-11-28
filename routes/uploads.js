const express = require('express');
const router = express.Router();
const path = require('path');

router.use('/avatars', express.static(path.join(__dirname, '..', 'uploads', 'avatars')));
router.use('/verification_docs', express.static(path.join(__dirname, '..', 'uploads', 'verification_docs')));

module.exports = router;
