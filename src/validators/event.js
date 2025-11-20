const { body, param, query } = require('express-validator');

const eventValidators = {
  create: [
    body('title')
      .notEmpty().withMessage('Title is required')
      .trim()
      .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
    
    body('description')
      .notEmpty().withMessage('Description is required')
      .trim(),
    
    body('startDate')
      .isISO8601().withMessage('Invalid start date format')
      .toDate(),
    
    body('endDate')
      .isISO8601().withMessage('Invalid end date format')
      .toDate(),
    
    body('location')
      .notEmpty().withMessage('Location is required')
      .trim(),
    
    body('dailySummaries')
      .optional()
      .isArray().withMessage('Daily summaries must be an array')
  ],

  update: [
    param('id')
      .notEmpty().withMessage('Event ID is required'),
    
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
    
    body('description')
      .optional()
      .trim(),
    
    body('startDate')
      .optional()
      .isISO8601().withMessage('Invalid start date format')
      .toDate(),
    
    body('endDate')
      .optional()
      .isISO8601().withMessage('Invalid end date format')
      .toDate(),
    
    body('location')
      .optional()
      .trim()
  ],

  delete: [
    param('id')
      .notEmpty().withMessage('Event ID is required')
  ],

  getById: [
    param('id')
      .notEmpty().withMessage('Event ID is required')
  ],

  getAll: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be at least 1'),
    
    query('upcoming')
      .optional()
      .isBoolean().withMessage('Upcoming must be a boolean')
  ]
};

module.exports = eventValidators;