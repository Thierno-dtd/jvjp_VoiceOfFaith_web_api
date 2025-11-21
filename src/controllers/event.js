const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');
const { asyncHandler } = require('../middleware/errorHandler');

class EventController {
  create = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const eventService = req.container.get('eventService');
    const result = await eventService.createEvent(req.body, req.file, req.user);

    res.status(201).json(result);
  });

  getAll = asyncHandler(async (req, res) => {
    const { limit = 20, page = 1, upcoming } = req.query;

    const eventService = req.container.get('eventService');
    const result = await eventService.getAllEvents({
      limit: parseInt(limit),
      page: parseInt(page),
      upcoming: upcoming === 'true'
    });

    res.json(result);
  });

  getById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const eventService = req.container.get('eventService');
    const result = await eventService.getEventById(id);

    res.json(result);
  });

  update = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const eventService = req.container.get('eventService');
    const result = await eventService.updateEvent(id, req.body, req.file);

    res.json(result);
  });

  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const eventService = req.container.get('eventService');
    const result = await eventService.deleteEvent(id);

    res.json(result);
  });
}

module.exports = new EventController();