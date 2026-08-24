const Notification = require('../models/Notification');

/**
 * Creates a notification in MongoDB and emits a real-time Socket.io event to recipient.
 */
const createNotification = async ({ recipient, sender, type, title, message, link, io }) => {
  try {
    if (!recipient) return null;
    const notif = await Notification.create({
      recipient,
      sender: sender || null,
      type,
      title,
      message,
      link: link || '',
    });

    if (io) {
      io.to(`user_${recipient.toString()}`).emit('new_notification', notif);
    }
    return notif;
  } catch (error) {
    console.error('Notification creation error:', error);
    return null;
  }
};

module.exports = {
  createNotification,
};
