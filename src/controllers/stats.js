const StatsService = require('../services/stats');

class StatsController {
  /**
   * Statistiques globales
   */
  async getOverview(req, res) {
    try {
      const result = await StatsService.getOverviewStats();
      res.json(result);
    } catch (error) {
      console.error('Error fetching overview stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  }

  /**
   * Statistiques des audios
   */
  async getAudioStats(req, res) {
    try {
      const { period = '30' } = req.query;

      const result = await StatsService.getAudioStats(parseInt(period));

      res.json(result);
    } catch (error) {
      console.error('Error fetching audio stats:', error);
      res.status(500).json({ error: 'Failed to fetch audio stats' });
    }
  }

  /**
   * Statistiques des utilisateurs
   */
  async getUserStats(req, res) {
    try {
      const result = await StatsService.getUserStats();
      res.json(result);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ error: 'Failed to fetch user stats' });
    }
  }

  /**
   * Statistiques d'engagement
   */
  async getEngagementStats(req, res) {
    try {
      const result = await StatsService.getEngagementStats();
      res.json(result);
    } catch (error) {
      console.error('Error fetching engagement stats:', error);
      res.status(500).json({ error: 'Failed to fetch engagement stats' });
    }
  }
}

module.exports = new StatsController();