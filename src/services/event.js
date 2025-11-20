const admin = require('firebase-admin');
const Event = require('../models/Event');
const { uploadFileToStorage } = require('./storage.service');
const { sendNotificationToTopic } = require('./notification.service');

class EventService {
  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Créer un nouvel événement
   */
  async createEvent(data, file, user) {
    try {
      const { title, description, startDate, endDate, location, dailySummaries } = data;

      // Upload image si présente
      let imageUrl = null;
      if (file) {
        imageUrl = await uploadFileToStorage(file, 'events');
      }

      // Parser les daily summaries
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

      // Créer l'événement
      const eventData = Event.create({
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        imageUrl: imageUrl || '',
        location,
        dailySummaries: parsedDailySummaries
      });

      const docRef = await this.db.collection(Event.collection).add(eventData);

      // Envoyer notification
      await sendNotificationToTopic('all_users', {
        title: '📅 Nouvel événement',
        body: title,
        data: {
          type: 'event',
          eventId: docRef.id
        }
      });

      return {
        success: true,
        message: 'Event created successfully',
        eventId: docRef.id
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupérer tous les événements
   */
  async getAllEvents({ limit, page, upcoming }) {
    try {
      let query = this.db.collection(Event.collection);

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
   * Récupérer un événement par ID
   */
  async getEventById(id) {
    try {
      const doc = await this.db.collection(Event.collection).doc(id).get();

      if (!doc.exists) {
        return {
          success: false,
          status: 404,
          error: 'Event not found'
        };
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
      throw error;
    }
  }

  /**
   * Mettre à jour un événement
   */
  async updateEvent(id, data, file) {
    try {
      const doc = await this.db.collection(Event.collection).doc(id).get();

      if (!doc.exists) {
        return {
          success: false,
          status: 404,
          error: 'Event not found'
        };
      }

      const updateData = Event.update({});

      if (data.title) updateData.title = data.title;
      if (data.description) updateData.description = data.description;
      if (data.startDate) updateData.startDate = new Date(data.startDate);
      if (data.endDate) updateData.endDate = new Date(data.endDate);
      if (data.location) updateData.location = data.location;

      // Upload nouvelle image si fournie
      if (file) {
        updateData.imageUrl = await uploadFileToStorage(file, 'events');
      }

      // Update daily summaries
      if (data.dailySummaries) {
        let parsedSummaries = typeof data.dailySummaries === 'string' 
          ? JSON.parse(data.dailySummaries)
          : data.dailySummaries;
        
        updateData.dailySummaries = parsedSummaries.map(summary => ({
          ...summary,
          date: new Date(summary.date)
        }));
      }

      await this.db.collection(Event.collection).doc(id).update(updateData);

      return {
        success: true,
        message: 'Event updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Supprimer un événement
   */
  async deleteEvent(id) {
    try {
      const doc = await this.db.collection(Event.collection).doc(id).get();

      if (!doc.exists) {
        return {
          success: false,
          status: 404,
          error: 'Event not found'
        };
      }

      await this.db.collection(Event.collection).doc(id).delete();

      return {
        success: true,
        message: 'Event deleted successfully'
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new EventService();