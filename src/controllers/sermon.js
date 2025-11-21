const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');
const { asyncHandler } = require('../middleware/errorHandler');

class SermonController {
  create = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const sermonService = req.container.get('sermonService');
    const result = await sermonService.createSermon(req.body, req.files, req.user);

    res.status(201).json(result);
  });

  getAll = asyncHandler(async (req, res) => {
    const { limit = 20, page = 1, year, month } = req.query;

    const sermonService = req.container.get('sermonService');
    const result = await sermonService.getAllSermons({
      limit: parseInt(limit),
      page: parseInt(page),
      year: year ? parseInt(year) : null,
      month: month ? parseInt(month) : null
    });

    res.json(result);
  });

  getById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const sermonService = req.container.get('sermonService');
    const result = await sermonService.getSermonById(id);

    res.json(result);
  });

  update = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { id } = req.params;

    const sermonService = req.container.get('sermonService');
    const result = await sermonService.updateSermon(id, req.body, req.user);

    res.json(result);
  });

  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const sermonService = req.container.get('sermonService');
    const result = await sermonService.deleteSermon(id, req.user);

    res.json(result);
  });

  incrementDownloads = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const sermonService = req.container.get('sermonService');
    const result = await sermonService.incrementDownloads(id);

    res.json(result);
  });

  getStats = asyncHandler(async (req, res) => {
    const { year } = req.query;

    const sermonService = req.container.get('sermonService');
    const result = await sermonService.getSermonStats({
      year: year ? parseInt(year) : null
    });

    res.json(result);
  });
}

module.exports = new SermonController();
