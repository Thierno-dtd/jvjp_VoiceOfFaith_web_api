const SermonService = require('../services/sermon');
const { validationResult } = require('express-validator');

class SermonController {
  /**
   * Créer un nouveau sermon
   */
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await SermonService.createSermon(
        req.body,
        req.files,
        req.user
      );

      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating sermon:', error);
      res.status(500).json({
        error: 'Failed to create sermon',
        message: error.message
      });
    }
  }

  /**
   * Récupérer tous les sermons
   */
  async getAll(req, res) {
    try {
      const { limit = 20, page = 1, year, month } = req.query;

      const result = await SermonService.getAllSermons({
        limit: parseInt(limit),
        page: parseInt(page),
        year: year ? parseInt(year) : null,
        month: month ? parseInt(month) : null
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching sermons:', error);
      res.status(500).json({ error: 'Failed to fetch sermons' });
    }
  }

  /**
   * Récupérer un sermon par ID
   */
  async getById(req, res) {
    try {
      const { id } = req.params;

      const result = await SermonService.getSermonById(id);

      if (!result.success) {
        return res.status(result.status || 404).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      console.error('Error fetching sermon:', error);
      res.status(500).json({ error: 'Failed to fetch sermon' });
    }
  }

  /**
   * Mettre à jour un sermon
   */
  async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;

      const result = await SermonService.updateSermon(id, req.body, req.user);

      if (!result.success) {
        return res.status(result.status || 400).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      console.error('Error updating sermon:', error);
      res.status(500).json({ error: 'Failed to update sermon' });
    }
  }

  /**
   * Supprimer un sermon
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      const result = await SermonService.deleteSermon(id, req.user);

      if (!result.success) {
        return res.status(result.status || 400).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      console.error('Error deleting sermon:', error);
      res.status(500).json({ error: 'Failed to delete sermon' });
    }
  }

  /**
   * Incrémenter les téléchargements
   */
  async incrementDownloads(req, res) {
    try {
      const { id } = req.params;

      const result = await SermonService.incrementDownloads(id);

      res.json(result);
    } catch (error) {
      console.error('Error incrementing downloads:', error);
      res.status(500).json({ error: 'Failed to increment downloads' });
    }
  }

  /**
   * Récupérer les statistiques
   */
  async getStats(req, res) {
    try {
      const { year } = req.query;

      const result = await SermonService.getSermonStats({
        year: year ? parseInt(year) : null
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching sermon stats:', error);
      res.status(500).json({ error: 'Failed to fetch sermon stats' });
    }
  }
}

module.exports = new SermonController();