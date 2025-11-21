const {
  NotFoundError,
  ValidationError,
  DatabaseError
} = require('../utils/errors');

class EventService {
  constructor(dependencies) {
    this.db = dependencies.db;
    this.storageService = null;
    this.notificationService = null;
  }

  setStorageService(storageService) {
    this.storageService = storageService;
  }

  setNotificationService(notificationService) {
    this.notificationService = notificationService;
  }

  async createEvent(data, file, user) {
    try {
      const { title, description, startDate, endDate, location, dailySummaries } = data;

      let imageUrl = null;
      if (file && this.storageService) {
        imageUrl = await this.storageService.uploadFile(file, 'events');
      }

      let parsedDailySummaries = [];
      if (dailySummaries) {
        parsedDailySummaries = typeof dailySummaries === 'string' 
          ? JSON.parse(dailySummaries)
          : dailySummaries;
        
        parsedDailySummaries = parsedDailySummaries.map(summary => ({
          ...summary,
          date: new Date(summary.date)
        }));
      }

      const eventData = {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        imageUrl: imageUrl || '',
        location,
        dailySummaries: parsedDailySummaries,
        createdAt: new Date()
      };

      const docRef = await this.db.collection('events').add(eventData);

      if (this.notificationService) {
        await this.notificationService.sendToTopic('all_users', {
          title: '📅 Nouvel événement',
          body: title,
          data: {
            type: 'event',
            eventId: docRef.id
          }
        });
      }

      return {
        success: true,
        message: 'Event created successfully',
        eventId: docRef.id
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to create event: ' + error.message);
    }
  }

  async getAllEvents({ limit, page, upcoming }) {
    try {
      let query = this.db.collection('events');

      if (upcoming) {
        query = query.where('startDate', '>=', new Date());
      }

      const snapshot = await query
        .orderBy('startDate', upcoming ? 'asc' : 'desc')
        .limit(limit)
        .offset((page - 1) * limit)
        .get();

      const events = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        events.push({
          id: doc.id,
          ...data,
          startDate: data.startDate.toDate(),
          endDate: data.endDate.toDate(),
          createdAt: data.createdAt.toDate(),
          dailySummaries: data.dailySummaries?.map(s => ({
            ...s,
            date: s.date.toDate()
          })) || []
        });
      });

      return {
        success: true,
        events,
        pagination: { page, limit }
      };
    } catch (error) {
      throw new DatabaseError('Failed to fetch events: ' + error.message);
    }
  }

  async getEventById(id) {
    try {
      const doc = await this.db.collection('events').doc(id).get();

      if (!doc.exists) {
        throw new NotFoundError('Event');
      }

      const data = doc.data();
      return {
        success: true,
        event: {
          id: doc.id,
          ...data,
          startDate: data.startDate.toDate(),
          endDate: data.endDate.toDate(),
          createdAt: data.createdAt.toDate(),
          dailySummaries: data.dailySummaries?.map(s => ({
            ...s,
            date: s.date.toDate()
          })) || []
        }
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to fetch event: ' + error.message);
    }
  }

  async updateEvent(id, data, file) {
    try {
      const doc = await this.db.collection('events').doc(id).get();

      if (!doc.exists) {
        throw new NotFoundError('Event');
      }

      const updateData = { updatedAt: new Date() };

      if (data.title) updateData.title = data.title;
      if (data.description) updateData.description = data.description;
      if (data.startDate) updateData.startDate = new Date(data.startDate);
      if (data.endDate) updateData.endDate = new Date(data.endDate);
      if (data.location) updateData.location = data.location;

      if (file && this.storageService) {
        updateData.imageUrl = await this.storageService.uploadFile(file, 'events');
      }

      if (data.dailySummaries) {
        let parsedSummaries = typeof data.dailySummaries === 'string' 
          ? JSON.parse(data.dailySummaries)
          : data.dailySummaries;
        
        updateData.dailySummaries = parsedSummaries.map(summary => ({
          ...summary,
          date: new Date(summary.date)
        }));
      }

      await this.db.collection('events').doc(id).update(updateData);

      return {
        success: true,
        message: 'Event updated successfully'
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to update event: ' + error.message);
    }
  }

  async deleteEvent(id) {
    try {
      const doc = await this.db.collection('events').doc(id).get();

      if (!doc.exists) {
        throw new NotFoundError('Event');
      }

      await this.db.collection('events').doc(id).delete();

      return {
        success: true,
        message: 'Event deleted successfully'
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to delete event: ' + error.message);
    }
  }
}

module.exports = EventService;