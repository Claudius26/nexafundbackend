const Notification = require('../models/Notification');
console.log()



exports.getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user._id,
      isAdmin: false
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};


exports.markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    notification.read = true;
    await notification.save();

    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
};


exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isAdmin: false },
      { read: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
};


exports.getAdminNotifications = async (req, res) => {
  try {
    const filter = { isAdmin: true };
    if (req.query.userId) filter.user = req.query.userId;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .populate('user', 'firstName lastName email');

    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch admin notifications' });
  }
};


exports.markAdminNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    notification.read = true;
    await notification.save();

    res.json({ message: 'Admin notification marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to mark admin notification as read' });
  }
};


exports.markAllAdminNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { isAdmin: true },
      { read: true }
    );

    res.json({ message: 'All admin notifications marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to mark all admin notifications as read' });
  }

};

exports.getAdminNotificationsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const notifications = await Notification.find({
      user: userId,
      isAdmin: true  
    }).sort({ createdAt: -1 })
    .populate('user', 'firstName lastName email');

    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch admin notifications for user" });
  }
};
