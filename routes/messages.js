const express = require("express");
const router = express.Router();
const { userAuth} = require("../middleware/authMiddleware");
const { adminAuth } = require("../middleware/adminMiddleware");
const messageController = require("../controllers/messageController");


router.get("/me", userAuth, messageController.getUserMessages);
router.post("/send", userAuth, messageController.sendMessage);


router.get("/admin/:userId", adminAuth, messageController.getUserMessagesByAdmin);
router.post("/admin/send", adminAuth, messageController.sendMessageFromAdmin);

module.exports = router;
