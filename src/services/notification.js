class NotificationService {
  constructor(dependencies) {
    this.messaging = dependencies.messaging;
  }

  async sendToTopic(topic, notification) {
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

      const response = await this.messaging.send(message);
      console.log('Notification sent successfully:', response);
      
      return { success: true, messageId: response };
    } catch (error) {
      console.error('Error sending notification:', error);
      throw new ExternalServiceError('FCM', 'Failed to send notification');
    }
  }

  async sendToUser(fcmToken, notification) {
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

      const response = await this.messaging.send(message);
      console.log('Notification sent to user:', response);
      
      return { success: true, messageId: response };
    } catch (error) {
      console.error('Error sending notification to user:', error);
      throw new ExternalServiceError('FCM', 'Failed to send notification');
    }
  }

  async sendToMultipleUsers(fcmTokens, notification) {
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

      const response = await this.messaging.sendMulticast(message);
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
      throw new ExternalServiceError('FCM', 'Failed to send notifications');
    }
  }

  async subscribeToTopic(fcmToken, topic) {
    try {
      const response = await this.messaging.subscribeToTopic([fcmToken], topic);
      console.log(`Successfully subscribed to topic ${topic}:`, response);
      return { success: true };
    } catch (error) {
      console.error('Error subscribing to topic:', error);
      throw new ExternalServiceError('FCM', 'Failed to subscribe to topic');
    }
  }

  async unsubscribeFromTopic(fcmToken, topic) {
    try {
      const response = await this.messaging.unsubscribeFromTopic([fcmToken], topic);
      console.log(`Successfully unsubscribed from topic ${topic}:`, response);
      return { success: true };
    } catch (error) {
      console.error('Error unsubscribing from topic:', error);
      throw new ExternalServiceError('FCM', 'Failed to unsubscribe from topic');
    }
  }
}

module.exports = NotificationService;