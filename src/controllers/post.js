const PostService = require('../services/post');
const { validationResult } = require('express-validator');

class PostController {
  /**
   * Créer un nouveau post
   */
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Media file is required' });
      }

      const result = await PostService.createPost(
        req.body,
        req.file,
        req.user
      );

      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({
        error: 'Failed to create post',
        message: error.message
      });
    }
  }

  /**
   * Récupérer tous les posts
   */
  async getAll(req, res) {
    try {
      const { limit = 20, page = 1, category, authorId } = req.query;

      const result = await PostService.getAllPosts({
        limit: parseInt(limit),
        page: parseInt(page),
        category,
        authorId
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({ error: 'Failed to fetch posts' });
    }
  }

  /**
   * Récupérer un post par ID
   */
  async getById(req, res) {
    try {
      const { id } = req.params;

      const result = await PostService.getPostById(id);

      if (!result.success) {
        return res.status(result.status || 404).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      console.error('Error fetching post:', error);
      res.status(500).json({ error: 'Failed to fetch post' });
    }
  }

  /**
   * Mettre à jour un post
   */
  async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;

      const result = await PostService.updatePost(id, req.body, req.user);

      if (!result.success) {
        return res.status(result.status || 400).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      console.error('Error updating post:', error);
      res.status(500).json({ error: 'Failed to update post' });
    }
  }

  /**
   * Supprimer un post
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      const result = await PostService.deletePost(id, req.user);

      if (!result.success) {
        return res.status(result.status || 400).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ error: 'Failed to delete post' });
    }
  }

  /**
   * Liker un post
   */
  async like(req, res) {
    try {
      const { id } = req.params;

      const result = await PostService.likePost(id);

      res.json(result);
    } catch (error) {
      console.error('Error liking post:', error);
      res.status(500).json({ error: 'Failed to like post' });
    }
  }
}

module.exports = new PostController();