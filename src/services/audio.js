// src/services/audio.service.js
const admin = require('firebase-admin');
const { uploadFileToStorage } = require('./storage.service');
const { sendNotificationToTopic } = require('./notification.service');

class AudioService {
  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Créer un nouvel audio
   */
  async createAudio(data, files, user) {
    try {
      const { title, description, category } = data;

      // Upload audio file
      const audioFile = files.audio[0];
      const audioUrl = await uploadFileToStorage(audioFile, 'audios');

      // Upload thumbnail si présent
      let thumbnailUrl = null;
      if (files.thumbnail) {
        const thumbnailFile = files.thumbnail[0];
        thumbnailUrl = await uploadFileToStorage(thumbnailFile, 'thumbnails');
      }

      // Créer le document audio
      const audioData = {
        title,
        description: description || '',
        audioUrl,
        thumbnailUrl,
        duration: 0,
        uploadedBy: user.uid,
        uploadedByName: user.displayName,
        category,
        createdAt: new Date(),
        downloads: 0,
        plays: 0
      };

      const docRef = await this.db.collection('audios').add(audioData);

      // Envoyer notification push
      await sendNotificationToTopic('all_users', {
        title: '🎵 Nouvel audio disponible',
        body: title,
        data: {
          type: 'audio',
          audioId: docRef.id
        }
      });

      return {
        success: true,
        message: 'Audio uploaded successfully',
        audioId: docRef.id,
        audioUrl
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupérer tous les audios
   */
  async getAllAudios({ limit, page, category }) {
    try {
      let query = this.db.collection('audios');

      if (category) {
        query = query.where('category', '==', category);
      }

      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset((page - 1) * limit)
        .get();

      const audios = [];
      snapshot.forEach(doc => {
        audios.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate()
        });
      });

      return {
        success: true,
        audios,
        pagination: {
          page,
          limit
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupérer un audio par ID
   */
  async getAudioById(id) {
    try {
      const doc = await this.db.collection('audios').doc(id).get();

      if (!doc.exists) {
        return null;
      }

      return {
        success: true,
        audio: {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate()
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mettre à jour un audio
   */
  async updateAudio(id, data, user) {
    try {
      const doc = await this.db.collection('audios').doc(id).get();

      if (!doc.exists) {
        return {
          success: false,
          status: 404,
          error: 'Audio not found'
        };
      }

      // Vérifier que l'utilisateur est le créateur ou admin
      if (doc.data().uploadedBy !== user.uid && user.role !== 'admin') {
        return {
          success: false,
          status: 403,
          error: 'Forbidden'
        };
      }

      const updateData = {};
      if (data.title) updateData.title = data.title;
      if (data.description) updateData.description = data.description;
      updateData.updatedAt = new Date();

      await this.db.collection('audios').doc(id).update(updateData);

      return {
        success: true,
        message: 'Audio updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Supprimer un audio
   */
  async deleteAudio(id, user) {
    try {
      const doc = await this.db.collection('audios').doc(id).get();

      if (!doc.exists) {
        return {
          success: false,
          status: 404,
          error: 'Audio not found'
        };
      }

      // Vérifier que l'utilisateur est le créateur ou admin
      if (doc.data().uploadedBy !== user.uid && user.role !== 'admin') {
        return {
          success: false,
          status: 403,
          error: 'Forbidden'
        };
      }

      await this.db.collection('audios').doc(id).delete();

      return {
        success: true,
        message: 'Audio deleted successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Incrémenter le compteur de lectures
   */
  async incrementPlays(id) {
    try {
      const docRef = this.db.collection('audios').doc(id);
      await docRef.update({
        plays: admin.firestore.FieldValue.increment(1)
      });

      return {
        success: true,
        message: 'Plays incremented'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Incrémenter le compteur de téléchargements
   */
  async incrementDownloads(id) {
    try {
      const docRef = this.db.collection('audios').doc(id);
      await docRef.update({
        downloads: admin.firestore.FieldValue.increment(1)
      });

      return {
        success: true,
        message: 'Downloads incremented'
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AudioService();