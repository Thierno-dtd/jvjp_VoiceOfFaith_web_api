const EventService = require('../services/event');
const { validationResult } = require('express-validator');

class EventController {
  /**
   * Créer un nouvel événement
   */
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await EventService.createEvent(
        req.body,
        req.file,
        req.user
      );

      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating event:', error);
      res.status(500).json({
        error: 'Failed to create event',
        message: error.message
      });
    }
  }

  /**
   * Récupérer tous les événements
   */
  async getAll(req, res) {
    try {
      const { limit = 20, page = 1, upcoming } = req.query;

      const result = await EventService.getAllEvents({
        limit: parseInt(limit),
        page: parseInt(page),
        upcoming: upcoming === 'true'
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  }

  /**
   * Récupérer un événement par ID
   */
  async getById(req, res) {
    try {
      const { id } = req.params;

      const result = await EventService.getEventById(id);

      if (!result.success) {
        return res.status(result.status || 404).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      console.error('Error fetching event:', error);
      res.status(500).json({ error: 'Failed to fetch event' });
    }
  }

  /**
   * Mettre à jour un événement
   */
  async update(req, res) {
    try {
      const { id } = req.params;

      const result = await EventService.updateEvent(id, req.body, req.file);

      if (!result.success) {
        return res.status(result.status || 400).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      console.error('Error updating event:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  }

  /**
   * Supprimer un événement
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      const result = await EventService.deleteEvent(id);

      if (!result.success) {
        return res.status(result.status || 400).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      console.error('Error deleting event:', error);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  }
}

module.exports = new EventController();