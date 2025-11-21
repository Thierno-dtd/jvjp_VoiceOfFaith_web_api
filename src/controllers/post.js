const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');
const { asyncHandler } = require('../middleware/errorHandler');

class PostController {
  create = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const postService = req.container.get('postService');
    const result = await postService.createPost(req.body, req.file, req.user);

    res.status(201).json(result);
  });

  getAll = asyncHandler(async (req, res) => {
    const { limit = 20, page = 1, category, authorId } = req.query;

    const postService = req.container.get('postService');
    const result = await postService.getAllPosts({
      limit: parseInt(limit),
      page: parseInt(page),
      category,
      authorId
    });

    res.json(result);
  });

  getById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const postService = req.container.get('postService');
    const result = await postService.getPostById(id);

    res.json(result);
  });

  update = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { id } = req.params;

    const postService = req.container.get('postService');
    const result = await postService.updatePost(id, req.body, req.user);

    res.json(result);
  });

  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const postService = req.container.get('postService');
    const result = await postService.deletePost(id, req.user);

    res.json(result);
  });

  like = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const postService = req.container.get('postService');
    const result = await postService.likePost(id);

    res.json(result);
  });
}

module.exports = new PostController();