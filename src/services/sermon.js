const admin = require('firebase-admin');
const Sermon = require('../models/Sermon');
const { uploadFileToStorage, deleteFileFromStorage } = require('./storage.service');
const { sendNotificationToTopic } = require('./notification.service');

class SermonService {
  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Créer un nouveau sermon
   */
  async createSermon(data, files, user) {
    try {
      if (!files || !files.image || !files.pdf) {
        throw new Error('Image and PDF files are required');
      }

      const { title, date } = data;

      // Upload image
      const imageFile = files.image[0];
      const imageUrl = await uploadFileToStorage(imageFile, 'sermons/images');

      // Upload PDF
      const pdfFile = files.pdf[0];
      const pdfUrl = await uploadFileToStorage(pdfFile, 'sermons/pdfs');

      // Créer le document sermon
      const sermonData = Sermon.create({
        title,
        date: new Date(date),
        imageUrl,
        pdfUrl,
        uploadedBy: user.uid
      });

      const docRef = await this.db.collection(Sermon.collection).add(sermonData);

      // Envoyer notification
      await sendNotificationToTopic('all_users', {
        title: '📖 Nouveau sermon disponible',
        body: title,
        data: {
          type: 'sermon',
          sermonId: docRef.id
        }
      });

      return {
        success: true,
        message: 'Sermon uploaded successfully',
        sermonId: docRef.id,
        imageUrl,
        pdfUrl
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupérer tous les sermons
   */
  async getAllSermons({ limit, page, year, month }) {
    try {
      let query = this.db.collection(Sermon.collection);

      // Filtrer par année/mois si fourni
      if (year) {
        const startDate = new Date(year, month ? month - 1 : 0, 1);
        const endDate = month 
          ? new Date(year, month, 0, 23, 59, 59)
          : new Date(year, 11, 31, 23, 59, 59);
        
        query = query
          .where('date', '>=', startDate)
          .where('date', '<=', endDate);
      }

      const snapshot = await query
        .orderBy('date', 'desc')
        .limit(limit)
        .offset((page - 1) * limit)
        .get();

      const sermons = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        sermons.push({
          id: doc.id,
          ...data,
          date: data.date.toDate(),
          createdAt: data.createdAt.toDate()
        });
      });

      return {
        success: true,
        sermons,
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
   * Récupérer un sermon par ID
   */
  async getSermonById(id) {
    try {
      const doc = await this.db.collection(Sermon.collection).doc(id).get();

      if (!doc.exists) {
        return {
          success: false,
          status: 404,
          error: 'Sermon not found'
        };
      }

      const data = doc.data();
      return {
        success: true,
        sermon: {
          id: doc.id,
          ...data,
          date: data.date.toDate(),
          createdAt: data.createdAt.toDate()
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mettre à jour un sermon
   */
  async updateSermon(id, data, user) {
    try {
      const doc = await this.db.collection(Sermon.collection).doc(id).get();

      if (!doc.exists) {
        return {
          success: false,
          status: 404,
          error: 'Sermon not found'
        };
      }

      // Vérifier les permissions (créateur ou admin)
      if (doc.data().uploadedBy !== user.uid && user.role !== 'admin') {
        return {
          success: false,
          status: 403,
          error: 'Forbidden'
        };
      }

      const updateData = Sermon.update({});
      if (data.title) updateData.title = data.title;
      if (data.date) updateData.date = new Date(data.date);

      await this.db.collection(Sermon.collection).doc(id).update(updateData);

      return {
        success: true,
        message: 'Sermon updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Supprimer un sermon
   */
  async deleteSermon(id, user) {
    try {
      const doc = await this.db.collection(Sermon.collection).doc(id).get();

      if (!doc.exists) {
        return {
          success: false,
          status: 404,
          error: 'Sermon not found'
        };
      }

      // Vérifier les permissions
      if (doc.data().uploadedBy !== user.uid && user.role !== 'admin') {
        return {
          success: false,
          status: 403,
          error: 'Forbidden'
        };
      }

      const sermonData = doc.data();

      // Supprimer les fichiers du Storage
      try {
        if (sermonData.imageUrl) {
          await deleteFileFromStorage(sermonData.imageUrl);
        }
        if (sermonData.pdfUrl) {
          await deleteFileFromStorage(sermonData.pdfUrl);
        }
      } catch (storageError) {
        console.warn('Error deleting files from storage:', storageError);
      }

      // Supprimer le document
      await this.db.collection(Sermon.collection).doc(id).delete();

      return {
        success: true,
        message: 'Sermon deleted successfully'
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
      const docRef = this.db.collection(Sermon.collection).doc(id);
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

  /**
   * Récupérer les statistiques des sermons
   */
  async getSermonStats({ year }) {
    try {
      let query = this.db.collection(Sermon.collection);

      if (year) {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);
        query = query.where('date', '>=', startDate).where('date', '<=', endDate);
      }

      const snapshot = await query.get();

      let totalDownloads = 0;
      const sermonsByMonth = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        totalDownloads += data.downloads || 0;

        const date = data.date.toDate();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        sermonsByMonth[monthKey] = (sermonsByMonth[monthKey] || 0) + 1;
      });

      return {
        success: true,
        stats: {
          total: snapshot.size,
          totalDownloads,
          avgDownloadsPerSermon: snapshot.size > 0 ? Math.round(totalDownloads / snapshot.size) : 0,
          sermonsByMonth
        }
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new SermonService();
