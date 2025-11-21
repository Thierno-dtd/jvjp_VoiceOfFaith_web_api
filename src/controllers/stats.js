const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');
const { asyncHandler } = require('../middleware/errorHandler');

class StatsController {
  getOverview = asyncHandler(async (req, res) => {
    const statsService = req.container.get('statsService');
    const result = await statsService.getOverviewStats();

    res.json(result);
  });

  getAudioStats = asyncHandler(async (req, res) => {
    const { period = '30' } = req.query;

    const statsService = req.container.get('statsService');
    const result = await statsService.getAudioStats(parseInt(period));

    res.json(result);
  });

  getUserStats = asyncHandler(async (req, res) => {
    const statsService = req.container.get('statsService');
    const result = await statsService.getUserStats();

    res.json(result);
  });

  getEngagementStats = asyncHandler(async (req, res) => {
    const statsService = req.container.get('statsService');
    const result = await statsService.getEngagementStats();

    res.json(result);
  });
}


module.exports = new StatsController();