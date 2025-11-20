// src/controllers/audio.controller.js
const AudioService = require('../services/audio');
const { validationResult } = require('express-validator');

class AudioController {
  /**
   * Créer un nouvel audio
   */
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.files || !req.files.audio) {
        return res.status(400).json({ error: 'Audio file is required' });
      }

      const result = await AudioService.createAudio(
        req.body,
        req.files,
        req.user
      );

      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating audio:', error);
      res.status(500).json({
        error: 'Failed to create audio',
        message: error.message
      });
    }
  }

  /**
   * Récupérer tous les audios
   */
  async getAll(req, res) {
    try {
      const { limit = 20, page = 1, category } = req.query;

      const result = await AudioService.getAllAudios({
        limit: parseInt(limit),
        page: parseInt(page),
        category
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching audios:', error);
      res.status(500).json({ error: 'Failed to fetch audios' });
    }
  }

  /**
   * Récupérer un audio par ID
   */
  async getById(req, res) {
    try {
      const { id } = req.params;

      const result = await AudioService.getAudioById(id);

      if (!result) {
        return res.status(404).json({ error: 'Audio not found' });
      }

      res.json(result);
    } catch (error) {
      console.error('Error fetching audio:', error);
      res.status(500).json({ error: 'Failed to fetch audio' });
    }
  }

  /**
   * Mettre à jour un audio
   */
  async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;

      const result = await AudioService.updateAudio(id, req.body, req.user);

      if (!result.success) {
        return res.status(result.status || 400).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      console.error('Error updating audio:', error);
      res.status(500).json({ error: 'Failed to update audio' });
    }
  }

  /**
   * Supprimer un audio
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      const result = await AudioService.deleteAudio(id, req.user);

      if (!result.success) {
        return res.status(result.status || 400).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      console.error('Error deleting audio:', error);
      res.status(500).json({ error: 'Failed to delete audio' });
    }
  }

  /**
   * Incrémenter le compteur de lectures
   */
  async incrementPlays(req, res) {
    try {
      const { id } = req.params;

      const result = await AudioService.incrementPlays(id);

      res.json(result);
    } catch (error) {
      console.error('Error incrementing plays:', error);
      res.status(500).json({ error: 'Failed to increment plays' });
    }
  }

  /**
   * Incrémenter le compteur de téléchargements
   */
  async incrementDownloads(req, res) {
    try {
      const { id } = req.params;

      const result = await AudioService.incrementDownloads(id);

      res.json(result);
    } catch (error) {
      console.error('Error incrementing downloads:', error);
      res.status(500).json({ error: 'Failed to increment downloads' });
    }
  }
}

module.exports = new AudioController();