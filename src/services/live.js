const admin = require('firebase-admin');
const { sendNotificationToTopic } = require('./notification');

class LiveService {
  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Récupérer le statut du LIVE
   */
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
      throw error;
    }
  }

  /**
   * Mettre à jour le statut du LIVE
   */
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

      // Vérifier si le document existe
      const doc = await this.db.collection('settings').doc('app_settings').get();

      if (!doc.exists) {
        await this.db.collection('settings').doc('app_settings').set({
          ...updateData,
          createdAt: new Date()
        });
      } else {
        await this.db.collection('settings').doc('app_settings').update(updateData);
      }

      // Envoyer notification si le LIVE démarre
      if (isLive) {
        await sendNotificationToTopic('all_users', {
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
      throw error;
    }
  }

  /**
   * Envoyer une notification manuelle
   */
  async sendLiveNotification(data) {
    try {
      const { title, body } = data;

      // Récupérer l'URL du live
      const doc = await this.db.collection('settings').doc('app_settings').get();
      const liveUrl = doc.exists ? doc.data().liveYoutubeUrl : '';

      await sendNotificationToTopic('all_users', {
        title,
        body,
        data: {
          type: 'live',
          url: liveUrl || ''
        }
      });

      return {
        success: true,
        message: 'Notification sent successfully'
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new LiveService();