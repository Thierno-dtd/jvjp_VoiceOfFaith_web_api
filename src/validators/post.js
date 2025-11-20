const { body, param, query } = require('express-validator');

const postValidators = {
  create: [
    body('type')
      .isIn(['image', 'video']).withMessage('Type must be either image or video'),
    
    body('category')
      .isIn(['pensee', 'pasteur', 'media']).withMessage('Invalid category'),
    
    body('content')
      .notEmpty().withMessage('Content is required')
      .trim()
      .isLength({ min: 1, max: 1000 }).withMessage('Content must be between 1 and 1000 characters')
  ],

  update: [
    param('id')
      .notEmpty().withMessage('Post ID is required'),
    
    body('content')
      .optional()
      .trim()
      .isLength({ min: 1, max: 1000 }).withMessage('Content must be between 1 and 1000 characters')
  ],

  delete: [
    param('id')
      .notEmpty().withMessage('Post ID is required')
  ],

  getById: [
    param('id')
      .notEmpty().withMessage('Post ID is required')
  ],

  getAll: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be at least 1'),
    
    query('category')
      .optional()
      .isIn(['pensee', 'pasteur', 'media']).withMessage('Invalid category'),
    
    query('authorId')
      .optional()
      .trim()
  ],

  like: [
    param('id')
      .notEmpty().withMessage('Post ID is required')
  ]
};

module.exports = postValidators;