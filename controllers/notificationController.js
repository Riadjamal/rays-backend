const Notification = require('../models/Notification');

const getNotificationModelForRole = (role) => {
  if (!role) return 'User';
  if (role === 'admin') return 'Admin';
  if (['sales', 'operations', 'finance', 'user'].includes(role)) return 'User';
  if (role === 'agent') return 'Agent';
  if (role === 'driver') return 'Driver';
  return 'User';
};

exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      user: req.userId,
      userModel: getNotificationModelForRole(req.userRole)
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.isRead = true;
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        user: req.userId,
        userModel: getNotificationModelForRole(req.userRole),
        isRead: false
      },
      { isRead: true }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

exports.sendNotification = async (userId, userModel, type, message, channel = 'in_app') => {
  try {
    const notification = await Notification.create({
      user: userId,
      userModel,
      type,
      message,
      channel,
      sentAt: new Date()
    });

    console.log(`Notification sent: ${message}`);

    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};
