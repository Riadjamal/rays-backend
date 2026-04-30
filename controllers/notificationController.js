const Notification = require('../models/Notification');

// Get user notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      user: req.userId,
      userModel: req.userRole.charAt(0).toUpperCase() + req.userRole.slice(1)
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

// Mark notification as read
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

// Mark all notifications as read
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        user: req.userId,
        userModel: req.userRole.charAt(0).toUpperCase() + req.userRole.slice(1),
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

// Send notification (helper function for other controllers)
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
    
    // In production, integrate with email/WhatsApp services
    console.log(`Notification sent: ${message}`);
    
    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};
