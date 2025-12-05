const express = require("express");
const router = express.Router();
const passwordResetController = require("../controllers/passwordResetController");

router.post("/forgot-password", passwordResetController.forgotPassword);
router.post("/reset-password", passwordResetController.resetPassword);


module.exports = router;
