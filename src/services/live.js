const { DatabaseError } = require('../utils/errors');

class LiveService {
  constructor(dependencies) {
    this.db = dependencies.db;
    this.notificationService = null;
  }

  setNotificationService(notificationService) {
    this.notificationService = notificationService;
  }

  async getLiveStatus() {
    try {
      const doc = await this.db.collection('settings').doc('app_settings').get();

      if (!doc.exists) {
        return {
          success: true,
          live: {
            isLive: false,
            liveYoutubeUrl: null,
            liveTitle: null
          }
        };
      }

      const data = doc.data();
      return {
        success: true,
        live: {
          isLive: data.isLive || false,
          liveYoutubeUrl: data.liveYoutubeUrl || null,
          liveTitle: data.liveTitle || null
        }
      };
    } catch (error) {
      throw new DatabaseError('Failed to fetch live status: ' + error.message);
    }
  }

  async updateLiveStatus(data, user) {
    try {
      const { isLive, liveYoutubeUrl, liveTitle } = data;

      const updateData = {
        isLive,
        updatedAt: new Date(),
        updatedBy: user.uid
      };

      if (liveYoutubeUrl !== undefined) {
        updateData.liveYoutubeUrl = liveYoutubeUrl;
      }
      if (liveTitle !== undefined) {
        updateData.liveTitle = liveTitle;
      }

      const doc = await this.db.collection('settings').doc('app_settings').get();

      if (!doc.exists) {
        await this.db.collection('settings').doc('app_settings').set({
          ...updateData,
          createdAt: new Date()
        });
      } else {
        await this.db.collection('settings').doc('app_settings').update(updateData);
      }

      if (isLive && this.notificationService) {
        await this.notificationService.sendToTopic('all_users', {
          title: '🔴 LIVE EN DIRECT !',
          body: liveTitle || 'Rejoignez-nous maintenant',
          data: {
            type: 'live',
            url: liveYoutubeUrl || ''
          }
        });
      }

      return {
        success: true,
        message: isLive ? 'Live started successfully' : 'Live stopped successfully',
        live: updateData
      };
    } catch (error) {
      throw new DatabaseError('Failed to update live status: ' + error.message);
    }
  }

  async sendLiveNotification(data) {
    try {
      const { title, body } = data;

      const doc = await this.db.collection('settings').doc('app_settings').get();
      const liveUrl = doc.exists ? doc.data().liveYoutubeUrl : '';

      if (this.notificationService) {
        await this.notificationService.sendToTopic('all_users', {
          title,
          body,
          data: {
            type: 'live',
            url: liveUrl || ''
          }
        });
      }

      return {
        success: true,
        message: 'Notification sent successfully'
      };
    } catch (error) {
      throw new DatabaseError('Failed to send notification: ' + error.message);
    }
  }
}

module.exports = LiveService;