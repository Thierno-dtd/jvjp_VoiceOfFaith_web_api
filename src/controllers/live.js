const LiveService = require('../services/live');
const { validationResult } = require('express-validator');

class LiveController {
  /**
   * Récupérer le statut du LIVE
   */
  async getStatus(req, res) {
    try {
      const result = await LiveService.getLiveStatus();
      res.json(result);
    } catch (error) {
      console.error('Error fetching live status:', error);
      res.status(500).json({ error: 'Failed to fetch live status' });
    }
  }

  /**
   * Mettre à jour le statut du LIVE
   */
  async updateStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await LiveService.updateLiveStatus(req.body, req.user);

      res.json(result);
    } catch (error) {
      console.error('Error updating live status:', error);
      res.status(500).json({
        error: 'Failed to update live status',
        message: error.message
      });
    }
  }

  /**
   * Envoyer une notification manuelle
   */
  async sendNotification(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await LiveService.sendLiveNotification(req.body);

      res.json(result);
    } catch (error) {
      console.error('Error sending live notification:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  }
}

module.exports = new LiveController();