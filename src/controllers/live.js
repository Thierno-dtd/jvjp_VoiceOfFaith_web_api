const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');
const { asyncHandler } = require('../middleware/errorHandler');

class LiveController {
  getStatus = asyncHandler(async (req, res) => {
    const liveService = req.container.get('liveService');
    const result = await liveService.getLiveStatus();

    res.json(result);
  });

  updateStatus = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const liveService = req.container.get('liveService');
    const result = await liveService.updateLiveStatus(req.body, req.user);

    res.json(result);
  });

  sendNotification = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const liveService = req.container.get('liveService');
    const result = await liveService.sendLiveNotification(req.body);

    res.json(result);
  });
}

module.exports = new LiveController();