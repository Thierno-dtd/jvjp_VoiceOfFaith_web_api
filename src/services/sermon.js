const {
  NotFoundError,
  AuthorizationError,
  ValidationError,
  DatabaseError
} = require('../utils/errors');

class SermonService {
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

  async createSermon(data, files, user) {
    try {
      if (!files || !files.image || !files.pdf) {
        throw new ValidationError('Image and PDF files are required');
      }

      const { title, date } = data;

      const imageFile = files.image[0];
      const imageUrl = await this.storageService.uploadFile(imageFile, 'sermons/images');

      const pdfFile = files.pdf[0];
      const pdfUrl = await this.storageService.uploadFile(pdfFile, 'sermons/pdfs');

      const sermonData = {
        title,
        date: new Date(date),
        imageUrl,
        pdfUrl,
        uploadedBy: user.uid,
        downloads: 0,
        createdAt: new Date()
      };

      const docRef = await this.db.collection('sermons').add(sermonData);

      if (this.notificationService) {
        await this.notificationService.sendToTopic('all_users', {
          title: '📖 Nouveau sermon disponible',
          body: title,
          data: {
            type: 'sermon',
            sermonId: docRef.id
          }
        });
      }

      return {
        success: true,
        message: 'Sermon uploaded successfully',
        sermonId: docRef.id,
        imageUrl,
        pdfUrl
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to create sermon: ' + error.message);
    }
  }

  async getAllSermons({ limit, page, year, month }) {
    try {
      let query = this.db.collection('sermons');

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
        pagination: { page, limit }
      };
    } catch (error) {
      throw new DatabaseError('Failed to fetch sermons: ' + error.message);
    }
  }

  async getSermonById(id) {
    try {
      const doc = await this.db.collection('sermons').doc(id).get();

      if (!doc.exists) {
        throw new NotFoundError('Sermon');
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
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to fetch sermon: ' + error.message);
    }
  }

  async updateSermon(id, data, user) {
    try {
      const doc = await this.db.collection('sermons').doc(id).get();

      if (!doc.exists) {
        throw new NotFoundError('Sermon');
      }

      if (doc.data().uploadedBy !== user.uid && user.role !== 'admin') {
        throw new AuthorizationError('You do not have permission to update this sermon');
      }

      const updateData = { updatedAt: new Date() };
      if (data.title) updateData.title = data.title;
      if (data.date) updateData.date = new Date(data.date);

      await this.db.collection('sermons').doc(id).update(updateData);

      return {
        success: true,
        message: 'Sermon updated successfully'
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to update sermon: ' + error.message);
    }
  }

  async deleteSermon(id, user) {
    try {
      const doc = await this.db.collection('sermons').doc(id).get();

      if (!doc.exists) {
        throw new NotFoundError('Sermon');
      }

      if (doc.data().uploadedBy !== user.uid && user.role !== 'admin') {
        throw new AuthorizationError('You do not have permission to delete this sermon');
      }

      const sermonData = doc.data();

      if (sermonData.imageUrl && this.storageService) {
        await this.storageService.deleteFile(sermonData.imageUrl);
      }
      if (sermonData.pdfUrl && this.storageService) {
        await this.storageService.deleteFile(sermonData.pdfUrl);
      }

      await this.db.collection('sermons').doc(id).delete();

      return {
        success: true,
        message: 'Sermon deleted successfully'
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to delete sermon: ' + error.message);
    }
  }

  async incrementDownloads(id) {
    try {
      await this.db.collection('sermons').doc(id).update({
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

  async getSermonStats({ year }) {
    try {
      let query = this.db.collection('sermons');

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
      throw new DatabaseError('Failed to fetch sermon stats: ' + error.message);
    }
  }
}

module.exports = SermonService;