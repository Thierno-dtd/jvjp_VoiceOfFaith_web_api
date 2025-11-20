const { body } = require('express-validator');

const liveValidators = {
  updateStatus: [
    body('isLive')
      .isBoolean().withMessage('isLive must be a boolean'),
    
    body('liveYoutubeUrl')
      .optional()
      .trim()
      .isURL().withMessage('Invalid YouTube URL'),
    
    body('liveTitle')
      .optional()
      .trim()
      .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters')
  ],

  sendNotification: [
    body('title')
      .notEmpty().withMessage('Title is required')
      .trim()
      .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
    
    body('body')
      .notEmpty().withMessage('Body is required')
      .trim()
      .isLength({ min: 3, max: 500 }).withMessage('Body must be between 3 and 500 characters')
  ]
};

module.exports = liveValidators;