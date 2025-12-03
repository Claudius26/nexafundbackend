const Message = require("../models/Message");
const User = require("../models/User");

exports.getUserMessages = async (req, res) => {
  try {
    const messages = await Message.find({ user: req.user._id })
      .sort({ sentAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};


exports.getUserMessagesByAdmin = async (req, res) => {
  try {
    const messages = await Message.find({ user: req.params.userId })
      .sort({ sentAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

exports.sendMessage = async (req, res) => {
 
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Message text required" });

    const msg = new Message({
      text,
      user: req.user._id,
      fromAdmin: false,
    });

    await msg.save();

    const io = req.app.get("io");
    io.to(`user_${req.user._id}`).emit("new_message", msg);

    res.json(msg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send message" });
  }
};


exports.sendMessageFromAdmin = async (req, res) => {
  try {
    const { text, userId } = req.body;
    if (!text || !userId) return res.status(400).json({ message: "Text and userId required" });

    const msg = new Message({
      text,
      user: userId,
      fromAdmin: true,
      admin: req.admin._id,
    });

    await msg.save();

    const io = req.app.get("io");
    io.to(`user_${userId}`).emit("new_message", msg);
    io.to(`admin_${req.admin._id}`).emit("new_message", msg);

    res.json(msg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send message" });
  }
};
