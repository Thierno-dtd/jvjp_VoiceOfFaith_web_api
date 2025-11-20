const { body, param, query } = require('express-validator');

const sermonValidators = {
  create: [
    body('title')
      .notEmpty().withMessage('Title is required')
      .trim()
      .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
    
    body('date')
      .isISO8601().withMessage('Invalid date format')
      .toDate()
  ],

  update: [
    param('id')
      .notEmpty().withMessage('Sermon ID is required'),
    
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters')
  ],

  delete: [
    param('id')
      .notEmpty().withMessage('Sermon ID is required')
  ],

  getById: [
    param('id')
      .notEmpty().withMessage('Sermon ID is required')
  ],

  getAll: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be at least 1'),
    
    query('year')
      .optional()
      .isInt({ min: 2000, max: 2100 }).withMessage('Invalid year'),
    
    query('month')
      .optional()
      .isInt({ min: 1, max: 12 }).withMessage('Invalid month')
  ],

  incrementDownloads: [
    param('id')
      .notEmpty().withMessage('Sermon ID is required')
  ]
};

module.exports = sermonValidators;
