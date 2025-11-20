const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');
const { asyncHandler } = require('../middleware/errorHandler');

class AudioController {

  create = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const audioService = req.container.get('audioService');
    const result = await audioService.createAudio(req.body, req.files, req.user);

    res.status(201).json(result);
  });

  getAll = asyncHandler(async (req, res) => {
    const { limit = 20, page = 1, category } = req.query;

    const audioService = req.container.get('audioService');
    const result = await audioService.getAllAudios({
      limit: parseInt(limit),
      page: parseInt(page),
      category
    });

    res.json(result);
  });

  getById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const audioService = req.container.get('audioService');
    const result = await audioService.getAudioById(id);

    res.json(result);
  });

  update = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { id } = req.params;

    const audioService = req.container.get('audioService');
    const result = await audioService.updateAudio(id, req.body, req.user);

    res.json(result);
  });

  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const audioService = req.container.get('audioService');
    const result = await audioService.deleteAudio(id, req.user);

    res.json(result);
  });

  incrementPlays = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const audioService = req.container.get('audioService');
    const result = await audioService.incrementPlays(id);

    res.json(result);
  });

  incrementDownloads = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const audioService = req.container.get('audioService');
    const result = await audioService.incrementDownloads(id);

    res.json(result);
  });
}

module.exports = new AudioController();