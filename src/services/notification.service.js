const admin = require('firebase-admin');

/**
 * Envoyer une notification à un topic
 * @param {string} topic - Nom du topic
 * @param {Object} notification - Contenu de la notification
 */
async function sendNotificationToTopic(topic, notification) {
  try {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {},
      topic: topic,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('Notification sent successfully:', response);
    
    return { success: true, messageId: response };

  } catch (error) {
    console.error('Error sending notification:', error);
    throw new Error('Failed to send notification');
  }
}

/**
 * Envoyer une notification à un utilisateur spécifique
 * @param {string} fcmToken - Token FCM de l'utilisateur
 * @param {Object} notification - Contenu de la notification
 */
async function sendNotificationToUser(fcmToken, notification) {
  try {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {},
      token: fcmToken,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('Notification sent to user:', response);
    
    return { success: true, messageId: response };

  } catch (error) {
    console.error('Error sending notification to user:', error);
    throw new Error('Failed to send notification');
  }
}

/**
 * Envoyer une notification à plusieurs utilisateurs
 * @param {Array<string>} fcmTokens - Liste des tokens FCM
 * @param {Object} notification - Contenu de la notification
 */
async function sendNotificationToMultipleUsers(fcmTokens, notification) {
  try {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {},
      tokens: fcmTokens,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log(`${response.successCount} notifications sent successfully`);
    
    if (response.failureCount > 0) {
      console.log(`${response.failureCount} notifications failed`);
    }
    
    return { 
      success: true, 
      successCount: response.successCount,
      failureCount: response.failureCount 
    };

  } catch (error) {
    console.error('Error sending notifications:', error);
    throw new Error('Failed to send notifications');
  }
}

/**
 * S'abonner un utilisateur à un topic
 * @param {string} fcmToken - Token FCM
 * @param {string} topic - Nom du topic
 */
async function subscribeToTopic(fcmToken, topic) {
  try {
    const response = await admin.messaging().subscribeToTopic([fcmToken], topic);
    console.log(`Successfully subscribed to topic ${topic}:`, response);
    return { success: true };
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    throw new Error('Failed to subscribe to topic');
  }
}

/**
 * Désabonner un utilisateur d'un topic
 * @param {string} fcmToken - Token FCM
 * @param {string} topic - Nom du topic
 */
async function unsubscribeFromTopic(fcmToken, topic) {
  try {
    const response = await admin.messaging().unsubscribeFromTopic([fcmToken], topic);
    console.log(`Successfully unsubscribed from topic ${topic}:`, response);
    return { success: true };
  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
    throw new Error('Failed to unsubscribe from topic');
  }
}

module.exports = {
  sendNotificationToTopic,
  sendNotificationToUser,
  sendNotificationToMultipleUsers,
  subscribeToTopic,
  unsubscribeFromTopic
};