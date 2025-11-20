const {
  NotFoundError,
  AuthorizationError,
  ValidationError,
  DatabaseError
} = require('../utils/errors');

class AudioService {
  constructor(dependencies) {
    this.db = dependencies.db;
    this.admin = dependencies.admin;
    this.storageService = null;
    this.notificationService = null;
  }

  setStorageService(storageService) {
    this.storageService = storageService;
  }

  setNotificationService(notificationService) {
    this.notificationService = notificationService;
  }

  async createAudio(data, files, user) {
    try {
      const { title, description, category } = data;

      if (!files || !files.audio) {
        throw new ValidationError('Audio file is required');
      }

      const audioFile = files.audio[0];
      const audioUrl = await this.storageService.uploadFile(audioFile, 'audios');

      let thumbnailUrl = null;
      if (files.thumbnail && files.thumbnail[0]) {
        const thumbnailFile = files.thumbnail[0];
        thumbnailUrl = await this.storageService.uploadFile(thumbnailFile, 'thumbnails');
      }

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

      if (this.notificationService) {
        await this.notificationService.sendToTopic('all_users', {
          title: '🎵 Nouvel audio disponible',
          body: title,
          data: {
            type: 'audio',
            audioId: docRef.id
          }
        });
      }

      return {
        success: true,
        message: 'Audio uploaded successfully',
        audioId: docRef.id,
        audioUrl
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to create audio: ' + error.message);
    }
  }

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
          limit,
          total: snapshot.size
        }
      };
    } catch (error) {
      throw new DatabaseError('Failed to fetch audios: ' + error.message);
    }
  }

  async getAudioById(id) {
    try {
      const doc = await this.db.collection('audios').doc(id).get();

      if (!doc.exists) {
        throw new NotFoundError('Audio');
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
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to fetch audio: ' + error.message);
    }
  }

  async updateAudio(id, data, user) {
    try {
      const doc = await this.db.collection('audios').doc(id).get();
      const allowedRoles = ['admin', 'pasteur', 'media']

      if (!doc.exists) {
        throw new NotFoundError('Audio');
      }

      if (doc.data().uploadedBy !== user.uid && allowedRoles.includes(user.role)) {
        throw new AuthorizationError('You do not have permission to update this audio');
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
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to update audio: ' + error.message);
    }
  }

  async deleteAudio(id, user) {
    try {
      const doc = await this.db.collection('audios').doc(id).get();

      if (!doc.exists) {
        throw new NotFoundError('Audio');
      }

      if (doc.data().uploadedBy !== user.uid && user.role !== 'admin') {
        throw new AuthorizationError('You do not have permission to delete this audio');
      }

      const audioData = doc.data();
      if (audioData.audioUrl && this.storageService) {
        await this.storageService.deleteFile(audioData.audioUrl);
      }
      if (audioData.thumbnailUrl && this.storageService) {
        await this.storageService.deleteFile(audioData.thumbnailUrl);
      }

      await this.db.collection('audios').doc(id).delete();

      return {
        success: true,
        message: 'Audio deleted successfully'
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to delete audio: ' + error.message);
    }
  }

  async incrementPlays(id) {
    try {
      const docRef = this.db.collection('audios').doc(id);
      await docRef.update({
        plays: this.admin.firestore.FieldValue.increment(1)
      });

      return {
        success: true,
        message: 'Plays incremented'
      };
    } catch (error) {
      throw new DatabaseError('Failed to increment plays: ' + error.message);
    }
  }

  async incrementDownloads(id) {
    try {
      const docRef = this.db.collection('audios').doc(id);
      await docRef.update({
        downloads: this.admin.firestore.FieldValue.increment(1)
      });

      return {
        success: true,
        message: 'Downloads incremented'
      };
    } catch (error) {
      throw new DatabaseError('Failed to increment downloads: ' + error.message);
    }
  }
}

module.exports = AudioService;